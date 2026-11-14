import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Clock3,
  Download,
  FileText,
  Film,
  Plus,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import {
  Badge,
  Button,
  Chip,
  ErrorState,
  Field,
  Loading,
  ProgressBar,
} from "./ui";
import "./ExplainerPanel.css";

const TERMINAL = new Set(["completed", "render_skipped", "failed"]);
const STATUS = {
  completed: "Ready",
  failed: "Needs attention",
  render_skipped: "Script ready",
  queued: "Queued",
  generating_script: "Writing explanation",
  building_scenes: "Preparing scenes",
  rendering: "Rendering video",
  muxing: "Adding narration",
};
const SCENE_LABELS = {
  title: "Introduction",
  bullet_list: "Key ideas",
  formula: "Equation",
  diagram_flow: "Flow",
  comparison: "Comparison",
  quote: "Highlight",
  summary: "Recap",
};
const clock = (value) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const filename = (value) =>
  value
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 60) || "explainer";

function ExplainerPlayer({ jobId, narrated }) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let objectUrl;
    setSource("");
    setError("");
    setDuration(null);
    setLoading(true);
    (async () => {
      try {
        // Native media requests cannot attach our bearer token. Fetch privately first.
        const blob = await api.blob(
          `/video-jobs/${jobId}/download?kind=mp4`,
          controller.signal,
        );
        if (cancelled) return;
        if (!blob.size || !blob.type.startsWith("video/"))
          throw new Error("The server did not return a playable video file.");
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [jobId, retry]);

  return (
    <div className="explainer-player">
      <div className="explainer-player-frame" aria-busy={loading}>
        {loading && (
          <div className="explainer-player-message" role="status">
            <RefreshCw size={24} className="animate-spin" aria-hidden="true" />
            <p>Loading your video…</p>
          </div>
        )}
        {error ? (
          <div className="explainer-player-message" role="alert">
            <Film size={28} aria-hidden="true" />
            <p>{error}</p>
            <Button
              variant="secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Load video again
            </Button>
          </div>
        ) : (
          source && (
            <video
              key={source}
              src={source}
              controls
              playsInline
              preload="metadata"
              aria-label="Generated explainer video"
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value)) setDuration(value);
              }}
              onError={() =>
                setError(
                  "Your browser couldn't play this video. Try loading it again, or download the MP4 below.",
                )
              }
            >
              Your browser does not support this video player. Download the MP4
              below to watch it.
            </video>
          )
        )}
      </div>
      <div className="explainer-player-meta">
        <span>
          {duration !== null ? (
            <>
              <Clock3 size={14} aria-hidden="true" />
              {clock(duration)}
            </>
          ) : (
            "MP4 video"
          )}
        </span>
        <span>{narrated ? "Narration included" : "Silent video"}</span>
      </div>
    </div>
  );
}

export function ExplainerPanel({ lecture }) {
  const [concept, setConcept] = useState("");
  const [complexity, setComplexity] = useState("intermediate");
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [downloading, setDownloading] = useState("");
  const initialized = useRef(false);

  const load = useCallback(
    async (signal) => {
      try {
        const data = await api.get("/video-jobs", signal);
        if (signal?.aborted) return;
        const mine = (data.items || []).filter(
          (job) => job.lecture_id === lecture.id,
        );
        setJobs(mine);
        setLoadError("");
        setSelectedId((previous) =>
          mine.some((job) => job.id === previous)
            ? previous
            : (mine[0]?.id ?? null),
        );
        if (!initialized.current) {
          initialized.current = true;
          setComposerOpen(mine.length === 0);
        }
      } catch (err) {
        if (!signal?.aborted) setLoadError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [lecture.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const active = jobs.some((job) => !TERMINAL.has(job.status));
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer;
    const tick = async () => {
      await load(controller.signal);
      if (!controller.signal.aborted) timer = window.setTimeout(tick, 2500);
    };
    timer = window.setTimeout(tick, 2500);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [active, load]);

  const create = async (event) => {
    event.preventDefault();
    const value = concept.trim();
    if (value.length < 2) {
      setFormError("Enter a concept using at least 2 characters.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const job = await api.post(`/lectures/${lecture.id}/explainer-videos`, {
        concept: value,
        complexity,
      });
      setJobs((previous) => [job, ...previous]);
      setSelectedId(job.id);
      setComposerOpen(false);
      setConcept("");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const selected = jobs.find((job) => job.id === selectedId);
  const download = async (kind, extension) => {
    if (!selected || downloading) return;
    setDownloading(kind);
    setDownloadError("");
    try {
      await api.download(
        `/video-jobs/${selected.id}/download?kind=${kind}`,
        `${filename(selected.concept)}.${extension}`,
      );
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading("");
    }
  };

  if (lecture.transcript_status !== "ready")
    return (
      <div className="card p-6">
        <h2 className="text-lg font-bold">
          Add a transcript to create an explainer
        </h2>
        <p className="mt-2 text-sm text-muted">
          Upload captions in the transcript panel first. Your video will use the
          ideas from this lecture.
        </p>
      </div>
    );
  if (loading) return <Loading label="Loading your explainers…" />;
  if (loadError && jobs.length === 0)
    return <ErrorState message={loadError} onRetry={() => load()} />;

  return (
    <section className="explainer-panel" aria-label="Video explainers">
      <div className="explainer-section-heading">
        <div>
          <h2>Video explainers</h2>
          <p>A clearer way to understand this lecture.</p>
        </div>
        {jobs.length > 0 && !composerOpen && (
          <Button
            variant="secondary"
            onClick={() => {
              setFormError("");
              setComposerOpen(true);
            }}
            aria-expanded={composerOpen}
            aria-controls="explainer-compose"
          >
            <Plus size={16} aria-hidden="true" />
            Create another
          </Button>
        )}
      </div>

      {composerOpen && (
        <form
          id="explainer-compose"
          onSubmit={create}
          className="card explainer-composer"
        >
          <h3>
            {jobs.length
              ? "Create another explainer"
              : "Turn a tricky idea into a video"}
          </h3>
          <p>
            Choose a concept from this lecture. We’ll explain it with animation
            and narration.
          </p>
          <Field
            id="explainer-concept"
            label="What would you like explained?"
            placeholder="A concept or idea from this video"
            value={concept}
            maxLength={120}
            onChange={(event) => setConcept(event.target.value)}
            error={formError}
          />
          <fieldset>
            <legend>Explanation level</legend>
            <div className="explainer-levels">
              {["beginner", "intermediate", "advanced"].map((level) => (
                <Chip
                  key={level}
                  selected={complexity === level}
                  onClick={() => setComplexity(level)}
                  className="capitalize"
                >
                  {level}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="explainer-composer-actions">
            <Button type="submit" loading={creating}>
              <Clapperboard size={16} aria-hidden="true" />
              Create video
            </Button>
            {jobs.length > 0 && (
              <Button
                variant="ghost"
                disabled={creating}
                onClick={() => setComposerOpen(false)}
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="explainer-form-hint">
            Rendering continues in the background. You can keep learning while
            it finishes.
          </p>
        </form>
      )}

      {loadError && (
        <div className="explainer-notice" role="status">
          <p>{loadError}</p>
          <Button variant="ghost" onClick={() => load()}>
            Refresh status
          </Button>
        </div>
      )}
      {jobs.length > 1 && (
        <div className="explainer-selector">
          <label htmlFor="explainer-selection">
            Your videos <span>{jobs.length}</span>
          </label>
          <select
            id="explainer-selection"
            className="field"
            value={selectedId ?? ""}
            onChange={(event) => {
              setSelectedId(Number(event.target.value));
              setDownloadError("");
            }}
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.concept} · {STATUS[job.status] || job.status} ·{" "}
                {new Date(job.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <article
          className="card explainer-result"
          aria-label="Selected explainer"
        >
          <header className="explainer-result-heading">
            <div className="explainer-result-tags">
              <Badge
                tone={
                  selected.status === "completed"
                    ? "ok"
                    : selected.status === "failed"
                      ? "danger"
                      : selected.status === "render_skipped"
                        ? "warn"
                        : "info"
                }
              >
                {selected.status === "completed" && (
                  <CheckCircle2 size={12} aria-hidden="true" />
                )}
                {STATUS[selected.status] || selected.status}
              </Badge>
              <span className="capitalize">{selected.complexity}</span>
              {selected.script_mode && (
                <span>
                  {selected.script_mode === "gemini"
                    ? "AI explanation"
                    : "Transcript-based script"}
                </span>
              )}
            </div>
            <h3>{selected.scene_plan?.title || selected.concept}</h3>
            {selected.scene_plan?.title &&
              selected.scene_plan.title !== selected.concept && (
                <p>Requested: {selected.concept}</p>
              )}
          </header>

          {!TERMINAL.has(selected.status) && (
            <div className="explainer-progress">
              <ProgressBar value={selected.progress} label={selected.stage} />
              <p role="status">
                <RefreshCw
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
                {selected.stage}
                <strong>{selected.progress}%</strong>
              </p>
              <span>
                This preview will appear here when your video is ready.
              </span>
            </div>
          )}
          {selected.status === "failed" && (
            <div className="explainer-job-error" role="alert">
              <strong>We couldn’t finish this video.</strong>
              <p>
                Create another explainer to try again. Your lecture and
                transcript are safe.
              </p>
              {selected.error && (
                <details>
                  <summary>View error details</summary>
                  <pre>{selected.error}</pre>
                </details>
              )}
            </div>
          )}
          {selected.status === "render_skipped" && (
            <div className="explainer-notice">
              <p>
                The script is ready, but video rendering is unavailable. You can
                still read the narration and download the scene plan below.
              </p>
            </div>
          )}
          {selected.status === "completed" && selected.video_url && (
            <>
              <ExplainerPlayer
                key={selected.id}
                jobId={selected.id}
                narrated={selected.stage === "Completed with narration"}
              />
              <div className="explainer-download">
                <Button
                  variant="secondary"
                  onClick={() => download("mp4", "mp4")}
                  loading={downloading === "mp4"}
                  disabled={Boolean(downloading)}
                >
                  <Download size={16} aria-hidden="true" />
                  Download MP4
                </Button>
                <p>Watch here, or save a copy to keep.</p>
              </div>
            </>
          )}
          {selected.status === "completed" && !selected.video_url && (
            <div className="explainer-job-error" role="alert">
              <strong>The video file isn’t available.</strong>
              <p>Refresh its status or create another explainer.</p>
              <Button variant="secondary" onClick={() => load()}>
                Refresh status
              </Button>
            </div>
          )}
          {downloadError && (
            <p role="alert" className="explainer-download-error">
              {downloadError}
            </p>
          )}

          {selected.narration && (
            <details
              className="explainer-details"
              key={`narration-${selected.id}`}
            >
              <summary>
                <span>
                  <FileText size={17} aria-hidden="true" />
                  Read narration
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className="explainer-details-body">
                <p className="explainer-narration">{selected.narration}</p>
                <Button
                  variant="ghost"
                  disabled={Boolean(downloading)}
                  onClick={() => download("narration", "txt")}
                >
                  <Download size={15} aria-hidden="true" />
                  Save narration
                </Button>
              </div>
            </details>
          )}
          {selected.scene_plan?.scenes?.length > 0 && (
            <details
              className="explainer-details"
              key={`scenes-${selected.id}`}
            >
              <summary>
                <span>
                  <Film size={17} aria-hidden="true" />
                  Explore scenes{" "}
                  <small>{selected.scene_plan.scenes.length}</small>
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <ol className="explainer-scenes">
                {selected.scene_plan.scenes.map((scene, index) => (
                  <li key={scene.id ?? index}>
                    <span className="explainer-scene-number">{index + 1}</span>
                    <div>
                      <p>{SCENE_LABELS[scene.type] || "Scene"}</p>
                      <h4>{scene.heading}</h4>
                      {scene.bullets?.length > 0 && (
                        <ul>
                          {scene.bullets.map((bullet, i) => (
                            <li key={i}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {scene.duration && (
                      <span className="explainer-scene-duration">
                        {scene.duration}s
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {selected.script && (
            <details
              className="explainer-details"
              key={`exports-${selected.id}`}
            >
              <summary>
                <span>
                  <Download size={17} aria-hidden="true" />
                  Export files
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className="explainer-exports">
                <Button
                  variant="secondary"
                  disabled={Boolean(downloading)}
                  onClick={() => download("script", "json")}
                >
                  Script JSON
                </Button>
                <Button
                  variant="secondary"
                  disabled={Boolean(downloading)}
                  onClick={() => download("plan", "plan.json")}
                >
                  Scene plan
                </Button>
                <Button
                  variant="secondary"
                  disabled={Boolean(downloading)}
                  onClick={() => download("py", "py")}
                >
                  Animation source
                </Button>
              </div>
            </details>
          )}
        </article>
      )}
    </section>
  );
}

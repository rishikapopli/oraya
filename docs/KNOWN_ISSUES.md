# ORAYA — Known Issues & Limitations

_Last updated: 2026-11-14 (build session 2)_

Everything below is real, verified behavior — not speculation. Each item states impact and
the workaround or fix path.

## Environment-dependent (this machine)

| # | Issue | Impact | Status / workaround |
|---|-------|--------|---------------------|
| 1 | **FFmpeg requires the project runtime PATH** | Resolved in-process: `.env`'s `ffmpeg_bin_path`/`ffprobe_bin_path` are read by `Settings` and their resolved directory is prepended to `PATH` at import. Values may name either the executable (`…/ffmpeg.exe`) or the folder that contains it (`…/ffmpeg`) — both forms are accepted and verified on disk; unresolvable values are skipped. | Verified from a shell whose PATH does **not** contain FFmpeg: `/health` reports `ffmpeg:true`, `shutil.which` resolves `ffmpeg.exe`/`ffprobe.exe`. (`ffprobe_bin_path` in `.env` was corrected to the real `…\.tools\bin\ffmpeg\ffprobe.exe`.) |
| 2 | **Manim CE rendering enabled; LaTeX absent** | Manim 0.22.1 renders real MP4s on Python 3.14.10. Formula scenes display Text when latex/dvisvgm are unavailable. | All seven approved templates rendered successfully. Install LaTeX + dvisvgm only if typeset MathTex is needed. |
| 3 | **Old model override resolved; provider errors remain possible** | All eight current live AI checks passed on `gemini-3.1-flash-lite`, including structured quizzes and an actual AI-scripted MP4. | Corrected the old lowercase model override in `.env`. General generation uses two bounded attempts (60 seconds each); chat uses a shorter per-attempt deadline and two attempts. Failures are explicitly labelled as transcript fallbacks, while the public preview reports an error. |
| 4 | **gTTS narration requires outbound network** | Verified with real scene narration and AAC mux. If TTS is unavailable, output is explicitly silent. | TTS has bounded connection/read timeouts. Per-scene measured speech sets animation duration; padding preserves scene alignment. Mux failures now fail the job instead of claiming narration succeeded. |
| 4a | **External endpoint scanner probes this machine** | An outside tool repeatedly requests `GET /health` and `GET /v1/models` on port 8000. `/health` now has a root alias returning 200; `/v1/models` returns 404 (not an ORAYA route). Log noise only — no app code polls these paths, and no data is exposed. | Ignore the 404 lines, or block the source IP at the firewall in production. |
| 4b | **Stale historical video-job rows** | Jobs 1 and 3 still show `render_skipped` ("Manim not installed") from before Manim CE was installed. They are historical records; jobs 4 and 5 completed with real MP4s afterward. | Leave as-is (honest history) or delete those rows from `video_jobs`. New jobs render normally — `renderer_status()` reports `{manim:true, ffmpeg:true}`. |

Credentials remain only in ignored local environment configuration; hardcoded copies found in existing smoke scripts were removed. `AI.mode` is a configuration/client-availability indicator, not proof of an upstream response. Actual calls and `generation.json` distinguish Gemini and demo results.


## Design/product limitations (intentional for MVP)

| # | Limitation | Notes |
|---|------------|-------|
| 5 | **Live YouTube transcript fetch is best-effort** | `youtube-transcript-api` is called on lecture creation; YouTube frequently blocks datacenter/cloud IPs and many videos disable captions. When it fails, `transcript_status="missing"` and the UI offers `.srt/.vtt/.txt` upload. We never fabricate a transcript. |
| 6 | **No duration for some videos** | Duration is parsed from the watch page microformat; if unavailable it's `0` and simply not displayed. |
| 7 | **Sample lecture has no video player** | The bundled sample is ORAYA-authored demo content (`source="sample"`), not a YouTube video, so the workspace shows an explanatory banner instead of an iframe. |
| 8 | **Watch progress stores only the furthest position** | `POST /lectures/{id}/progress` keeps `max(old, new)` (small rewinds don't reduce it). Resume always starts at the furthest point watched. |
| 9 | **Short-answer grading is keyword-recall based in demo mode** | `grade_short()` measures content-word overlap ≥45% (or ≥4 shared content words) against the transcript's own sentence. Gemini mode uses the same fallback grader; an LLM grader is a documented next step. |
| 10 | **In-process job queue** | Explainer jobs run as asyncio threads in the web process. Fine for demo/single-instance; production should move to a dedicated worker (Redis/RQ or Render worker service) — see `docs/ARCHITECTURE.md` §7. |
| 11 | **SQLite by default; no migrations** | Local dev uses SQLite with `create_all`. Supabase Postgres works via `DATABASE_URL`, but schema changes require `alembic` (not yet wired). |
| 12 | **Auth is first-party JWT, not Supabase Auth yet** | PBKDF2 + HS256 JWT issued by ORAYA. The frontend only ever stores/attaches a bearer token, so swapping to Supabase Auth is contained to `backend/app/security.py` + `deps.py`. |
| 13 | **No pgvector yet** | Retrieval uses TF-IDF (no key) or Gemini embeddings (key) held in process memory per lecture. Production-grade persistent vector search would use pgvector — documented, not implemented. |
| 14 | **Light theme only** | The product mockup direction is light cream/coral; dark mode is intentionally out of scope (see `design-system/ORAYA/MASTER.md`). |
| 15 | **Flashcard fronts can repeat across lectures** | Dedup on generation is per lecture: "What is Net?" can exist once for lecture A and once for lecture B (or twice in one lecture when two sentences match). The review card shows the source lecture link to disambiguate. |

## Known UI caveats

- **Tutor runtime and relevance fixes (2026-11-14):** the running server now loads the configured environment, and the exact Avengers question has produced a live, cited Gemini reply. Chat uses the separately configurable `GEMINI_TUTOR_MODEL` (default `gemini-3.1-flash-lite`); other AI features retain their existing model. Subject overviews and multi-turn follow-ups now retain the relevant transcript context. API outages still occur intermittently: failed chat requests show clearly labelled transcript excerpts instead of pretending to be live explanations. Chat generation requests have a 35-second deadline and an 800-token response budget.
- **A short clip may mention a subject without explaining its background.** The Avengers captions support discussion of the depicted conflict, losses, and dialogue; they do not provide a full history or definition of the team. The tutor explains supported content and states that limit. It does not invent external facts or attach unrelated timestamps.

- The landing-page tutor is now a **live AI preview** over an ORAYA-authored polymer transcript, with free-form questions, source links, visible errors and a 10-request/minute per-IP limit. Its visual is labelled as an illustration. Other landing animations are labelled as tool previews and link to real lecture workflows.
- YouTube embeds are controlled by the video owner; if embedding is disabled the player shows
  a fallback card with a direct "Watch on YouTube" link.
- The activity chart and mastery percentages are computed from real recorded events only —
  there is no simulated/fake analytics data anywhere.

## Earlier Phase 0.5 verification evidence (superseded by current results)

The corrected Newton's second law explainer was actually rendered to a 44-second 1080p60 MP4 with AAC narration (`backend/storage/phase05/jobs/2/explainer.mp4`). Full decoding passed, audio is non-silent (-3.7 dB peak), no narration section overruns its scene, and scene alignment is within 16.7 ms. `media-verification.json` beside the MP4 contains the measured results. This render used the documented demo-script fallback after an upstream 504; it is not evidence of a Gemini-generated explainer script.

A separate real `gemini-3.8-flash` text request returned `ORAYA connection verified.` This proves live connectivity and credential acceptance, while intermittent structured-generation failures remain a service availability issue. Backend offline regression tests: 31 passed. Frontend production build: passed.

The final structured generation run also exhausted the three-attempt retry policy with 504 and used the demo fallback. This upstream limitation was not resolved by the documented low-thinking setting or by the diagnostic alternate model. The application download and renderer-status HTTP checks passed against the actual completed output (200 responses; file size matched).

Final job 3 also completed and passed the media checks with a 44-second 1080p60 narrated MP4 and 16.7 ms maximum scene offset. It explicitly records demo script mode. Final evidence: `backend/storage/phase05/summary.json`. At that earlier stage, structured Gemini generation had not succeeded; it is now verified in the current results below; local rendering limitations are resolved in the activated project environment.

The Avengers follow-up was also verified through the live app with `mode: gemini` and source links. Transient outages and rejected/unverifiable citations remain explicitly labelled fallbacks; neither is presented as a generated explanation. Regression checks cover the reported Avengers query, follow-up chains, exact caption positions, absent support, and invented/normalized/grouped timestamps (41 tests passing).

## Current full AI verification — 2026-11-14

All eight live checks passed: landing chat, tutor, summary/chapter/definition notes, quizzes, embeddings, and a Gemini-scripted narrated MP4. The final video is 69 seconds at 1080p, with full decoding and exact measured audio/scene alignment. Backend regression suite: 47 passed; production frontend build: passed. Evidence is in `backend/storage/ai-full-verification/report.json`. The earlier Gemini-scripted-video blocker is resolved.

Use `./start-oraya.ps1` from the repository root; use `-Restart` after backend/configuration changes. The launcher uses hidden background processes and consistent IPv4 addresses, so runtime availability does not depend on a temporary coding terminal. Public-preview rate limiting is in-process; a shared limiter would be needed for a multi-instance production deployment. AI content still depends on the supplied transcript, and outside background is not invented or cited as video evidence.

## Explainer player fix — 2026-11-14

The malformed double-prefix media URL and missing bearer header in native video requests are resolved. Playback now uses an authenticated fetch and a private object URL, retaining owner-only access. The reported 48-second video played successfully in the browser without regeneration. The nested sidebar layout has been replaced with a full-width player and expandable details. Regression suite: 50 passed; frontend build passed. Background-server restarts now wait for backend readiness before reloading the frontend to avoid an early session-check race.

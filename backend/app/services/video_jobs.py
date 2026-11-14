"""Asynchronous explainer-video jobs.

Stages are persisted on the VideoJob row so the frontend can poll progress.
Every optional dependency (manim, ffmpeg, TTS) degrades to a documented state
instead of failing the job — see docs/KNOWN_ISSUES.md.
"""
from __future__ import annotations

import asyncio
import json
import logging
import subprocess
import sys
from pathlib import Path

from ..config import settings
from ..database import SessionLocal
from ..models import Chapter, Lecture, TranscriptSegment, VideoJob
from . import demo_ai
from .ai import ai
from .manim_templates import (
    PlanValidationError,
    build_scene_plan,
    renderer_status,
    render_source,
    validate_scene_plan,
)

logger = logging.getLogger("oraya.video")

SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "concept": {"type": "string"},
        "complexity": {"type": "string", "enum": ["beginner", "intermediate", "advanced"]},
        "title": {"type": "string"},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["title", "bullet_list", "formula", "diagram_flow", "comparison", "quote", "summary"],
                    },
                    "heading": {"type": "string"},
                    "narration": {"type": "string"},
                    "bullets": {"type": "array", "items": {"type": "string"}},
                    "formula": {"type": "string"},
                    "duration": {"type": "integer"},
                },
                "required": ["type", "heading", "narration"],
            },
        },
    },
    "required": ["concept", "scenes"],
}


def enqueue(job_id: int) -> None:
    """Schedule the job on the running event loop (runs in a worker thread)."""
    asyncio.get_running_loop().create_task(asyncio.to_thread(_run_job, job_id))


def _update(job_id: int, **fields) -> None:
    db = SessionLocal()
    try:
        job = db.get(VideoJob, job_id)
        if job is None:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        db.commit()
    finally:
        db.close()


def _job_dir(job_id: int) -> Path:
    d = Path(settings.storage_dir).resolve() / "jobs" / str(job_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _load_context(lecture_id: int) -> tuple[list[tuple[int, float, float, str]], list[tuple[str, float]], str]:
    db = SessionLocal()
    try:
        lecture = db.get(Lecture, lecture_id)
        segments = [
            (s.id, s.start, s.end, s.text) for s in sorted(lecture.segments, key=lambda x: x.idx)
        ] if lecture else []
        chapters = [(c.title, c.start) for c in sorted(lecture.chapters, key=lambda x: x.idx)] if lecture else []
        return segments, chapters, (lecture.title if lecture else "Lecture")
    finally:
        db.close()


def _run_job(job_id: int) -> None:
    out = _job_dir(job_id)
    try:
        db = SessionLocal()
        try:
            job = db.get(VideoJob, job_id)
            if job is None:
                return
            lecture_id = job.lecture_id
            concept = job.concept
            complexity = job.complexity
        finally:
            db.close()

        segments, chapters, title = _load_context(lecture_id)

        # 1. script -------------------------------------------------------
        _update(job_id, status="generating_script", stage="Writing the explanation script", progress=15)
        script_prompt = (
            f"You are producing a narration script for a short animated explainer video.\n"
            f"Lecture: {title}\nConcept: {concept}\nLevel: {complexity}\n\n"
            f"Use ONLY facts that appear in the transcript excerpts below. Do not add outside facts.\n"
            f"Transcript excerpts:\n"
            + "\n".join(f"- [{int(s)}s] {t}" for _, s, _, t in segments[:80])
            + "\n\nReturn a JSON object with 4-6 scenes. Each scene: type "
            "(title|bullet_list|formula|diagram_flow|comparison|quote|summary), heading, "
            "narration (2-3 spoken sentences), bullets (short phrases), duration (seconds 4-14)."
        )
        script, mode = ai.complete_json(
            script_prompt,
            SCRIPT_SCHEMA,
            system="You write accurate, plain-language educational narration grounded strictly in the provided transcript.",
            fallback=lambda: demo_ai.generate_script(concept, complexity, segments, chapters),
        )

        # 2. validated scene plan + our template source --------------------
        _update(job_id, status="building_scenes", stage="Building animation scenes", progress=35)
        try:
            plan = build_scene_plan(script)
        except PlanValidationError as exc:
            plan = demo_ai.generate_script(concept, complexity, segments, chapters)
            plan = validate_scene_plan(plan)
            logger.warning("AI plan rejected (%s); used template plan instead", exc)
            mode = "demo"
        plan["title"] = plan.get("title") or f"{concept} — {title}"
        plan["generation_mode"] = mode

        narration = "\n\n".join(s["narration"] for s in plan["scenes"] if s.get("narration"))
        status = renderer_status()
        audio_path = _prepare_narration(plan, out) if status["ffmpeg"] and status["manim"] else None
        source = render_source(plan)
        (out / "plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
        (out / "script.json").write_text(json.dumps(script, indent=2), encoding="utf-8")
        (out / "scene.py").write_text(source, encoding="utf-8")
        (out / "narration.txt").write_text(narration, encoding="utf-8")
        (out / "generation.json").write_text(json.dumps({"script_mode": mode, "model": settings.gemini_model}), encoding="utf-8")

        _update(
            job_id,
            scene_plan=plan,
            script=script,
            manim_source=source,
            narration=narration,
            progress=50,
            stage=f"Scenes ready ({len(plan['scenes'])} scenes, {mode} script)",
        )

        # 3. render (optional) --------------------------------------------
        if not status["manim"]:
            _update(
                job_id,
                status="render_skipped",
                progress=100,
                stage="Render skipped — Manim not installed. Scene plan, script and narration are ready.",
            )
            return

        _update(job_id, status="rendering", stage="Rendering animation with Manim", progress=60)
        scene_file = out / "scene.py"
        result = subprocess.run(
            [
                sys.executable, "-m", "manim",
                "-qh", "--format", "mp4",
                str(scene_file), "OrayaExplainer",
            ],
            cwd=str(out),
            capture_output=True,
            text=True,
            timeout=900,
        )
        mp4s = sorted(out.glob("**/OrayaExplainer.mp4"))
        if result.returncode != 0 or not mp4s:
            tail = (result.stderr or result.stdout or "")[-1200:]
            _update(
                job_id,
                status="failed",
                progress=100,
                stage="Render failed",
                error=f"Manim exited with code {result.returncode}:\n{tail}",
            )
            return

        final_mp4 = out / "explainer.mp4"
        mp4s[0].replace(final_mp4)
        _update(job_id, video_path=str(final_mp4), progress=85, stage="Rendering complete")

        # 4. narration audio + mux (optional) ------------------------------
        has_audio = False
        if audio_path and status["ffmpeg"]:
            _update(job_id, status="muxing", stage="Mixing narration into the video", progress=92)
            muxed = out / "explainer_with_audio.mp4"
            proc = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(final_mp4),
                    "-i", str(audio_path),
                    "-c:v", "copy", "-c:a", "aac",
                    "-af", "apad", "-t", str(sum(s["duration"] for s in plan["scenes"])), str(muxed),
                ],
                capture_output=True,
                text=True,
                timeout=300,
            )
            if proc.returncode == 0 and muxed.exists():
                muxed.replace(final_mp4)
                has_audio = True
            else:
                raise RuntimeError("Narration mux failed: " + proc.stderr[-1200:])

        _update(
            job_id,
            status="completed",
            progress=100,
            stage="Completed with narration" if has_audio else "Completed (silent — TTS unavailable)",
        )
    except subprocess.TimeoutExpired:
        _update(job_id, status="failed", progress=100, stage="Render timed out", error="Manim render exceeded 15 minutes")
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Video job %s failed", job_id)
        _update(job_id, status="failed", progress=100, stage="Failed", error=str(exc)[:2000])


def _prepare_narration(plan: dict, out: Path) -> Path | None:
    """Measure each spoken scene and pad its audio to the same visual timeline."""
    from pydub import AudioSegment
    import math

    combined = AudioSegment.silent(duration=0)
    timings = []
    for index, scene in enumerate(plan["scenes"]):
        scene_dir = out / "audio" / str(index + 1)
        scene_dir.mkdir(parents=True, exist_ok=True)
        target = _synthesize_narration(scene["narration"], scene_dir)
        if target is None:
            return None
        spoken = AudioSegment.from_file(target)
        duration = max(scene["duration"], math.ceil(len(spoken) / 1000 + 0.5), 4)
        if duration > 120:
            raise ValueError("Scene narration exceeds the 120-second rendering limit")
        timings.append({"scene": index + 1, "start": len(combined) / 1000,
                        "speech_duration": len(spoken) / 1000, "duration": duration})
        combined += spoken + AudioSegment.silent(duration=duration * 1000 - len(spoken))
    for scene, timing in zip(plan["scenes"], timings):
        scene["duration"] = timing["duration"]
    target = out / "narration.wav"
    combined.export(target, format="wav")
    (out / "timing.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")
    return target


def _synthesize_narration(narration: str, out: Path) -> Path | None:
    if not narration.strip():
        return None
    try:
        from gtts import gTTS  # type: ignore

        target = out / "narration.mp3"
        gTTS(text=narration, lang="en", timeout=(10, 30)).save(str(target))
        return target
    except Exception as exc:
        logger.info("TTS skipped: %s", exc)
        return None

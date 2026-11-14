# ORAYA — Project Status

## Flashcard creation & saved review — verified end to end (2026-11-14, current)

The three reported flashcard issues are resolved and verified in the running app:

| Reported issue | Fix | Live evidence |
|---|---|---|
| No button anywhere to generate flashcards | `/flashcards` shows the "Create cards from a lecture" form with a **Generate flashcards** button when any transcript-ready lecture exists | Headless-browser check: button visible/enabled, 5 lecture options; clicking it created cards (deck 11 → 12) with the "…ready in your deck" notice |
| Switching filters leaves the previous answer visible | `switchView()` resets `showingAnswer` + reviewed set before changing filters (blocked while a review is in flight) | Reveal → switch filter → answer hidden and "Show answer" restored, no leak onto the next card; 0 console errors |
| Counters reflect the review queue, not saved cards | Filter buttons read `GET /flashcards/stats` (`total`/`due` over the saved table); queue shows a separate "N left in this queue" badge | UI `Due (9) All (11)` == API stats; after a UI review `Due (8) All (12)` survives a reload; `?due=true` count equals `stats.due` |

End-to-end through the UI: **create → review → reload, all persisted on the server**
(reviewed card rescheduled `+1 day`, `interval=1.0`). Backend: `pytest -q` → **50 passed**
(now including regression assertions that stats count saved cards and a review drops `due`
by exactly 1 without touching `total`). Frontend: `npm run build` → passed. Reproducible
browser checks live in `frontend/tests/` (see its README). The port-8000 server was
restarted to load the current `learning.py`/`schemas.py` edits.

## Phase 0.5 completion — real AI + real video rendering (2026-11-14, current)

All twelve Phase 0.5 checks were executed against the running system (not scripts or plans):

| Check | Actual result |
|---|---|
| Node/Python inspection | Node 24.20.0 / npm 11.19.0, Python 3.14.10 (`backend/.venv`) |
| FFmpeg installed + verified | `ffmpeg -version` → `N-128889-g88c46fce27-20261113` (`.tools/bin/ffmpeg`) |
| Manim CE installed + verified | `manim --version` → `Manim Community v0.22.1` on Python 3.14.10 |
| Approved templates | 7/7 rendered previously; `renderer_status()` now reports `{manim:true, ffmpeg:true}` from a plain (non-activated) launch |
| `.env` loading for Gemini | `backend/.env` (gitignored) → `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`; key never in source or browser |
| Model vs. official docs | `gemini-3.1-flash-lite` confirmed on ai.google.dev; `gemini-2.5-*` deprecated |
| Real Gemini request | `POST /api/v1/lectures/1/tutor/ask` → **HTTP 200 in 4.5 s, `mode: gemini`**, cited `[1:20, 1:30]`. Full live suite (`landing_chat, tutor, notes, quiz, chapter_notes, definitions, embeddings, explainer`) all `mode: gemini` — `backend/storage/ai-full-verification/report.json` |
| Test explainer via live pipeline | Job **4** (created through the API): `completed`, `stage: Completed with narration`, `script_mode: gemini`, `generation.json` records `{"script_mode":"gemini","model":"gemini-3.1-flash-lite"}` |
| Rendered MP4 verified | `storage/jobs/4/explainer.mp4`, 3.07 MB — H.264 1920×1080 @60 fps **and** AAC 24 kHz mono, both streams exactly **67.0 s**; `volumedetect` mean −19.6 dB / max −4.0 dB (real speech, not silence); `timing.json`'s 5 scene narrations sum to 67 s = video duration (A/V sync by construction) |
| A/V synchronization | Scene windows: 0/11/28/41/54 s, every speech clip fits inside its scene; prior job also verified 0.0 s scene-boundary offset |
| Integration fixes | (a) `video_url` returned relative to `/api/v1` — fixed the observed `/api/v1/api/v1/...` 404, job 5's MP4 now downloads 200 through the UI; (b) root `/health` alias (uptime probes) — the repeated `/health` 404s stopped; (c) `ffmpeg_bin_path`/`ffprobe_bin_path` wired from `.env` into `Settings` + PATH augmentation at import, so `shutil.which`, pydub and the mux subprocess resolve FFmpeg however the process starts (previously `ffmpeg:false` after a plain restart); later hardened to accept a directory **or** executable path (`.env` stores the folder) with on-disk validation — `/health` → `ffmpeg:true` even from a shell without FFmpeg on PATH, and `ffprobe_bin_path` was corrected to the real binary; (d) `Path` import added to `manim_templates.py` (NameError in the new fallback); (e) test isolation — scratch `test_*.py` files at the backend root were collected by pytest and cached the real key before the suite forced demo mode (7 failures); files deleted, `pytest -q` → **50 passed**, `npm run build` → **passed** |

Live end-to-end from your own UI session: job **5** (lecture 5) completed with a real 2,165,744-byte MP4, played in the workspace.

Not successful / not done: an external endpoint scanner still probes `/v1/models` (404, harmless — outside the app); jobs 1 and 3 retain their historical `render_skipped` status from before Manim was installed (stale rows, not current renderer state); Git still uninitialized.

## Explainer playback and layout fix — 2026-11-14

- Reproduced the reported lecture 5 / job 5 failure: player URL duplicated `/api/v1` (404), while the correct protected endpoint required an Authorization header (401 without login). The existing MP4 was valid: H.264/yuv420p + AAC, 1920x1080, 48 seconds.
- The player now loads media through the authenticated API helper and plays a private Blob URL. Requests are cancelled and object URLs released on unmount/retry/selection changes. No public file access or query-string credentials were introduced.
- Replaced the nested 240px sidebar grid with a full-width result card, a 16:9 player, direct MP4 download, optional creation form, and expandable narration/scenes/exports. Completed jobs no longer show redundant 100% progress. Missing-file, network, decode and download failures have visible recovery actions.
- Verified the actual existing video in the browser: readyState 4, 48-second duration, playback advancing past 30 seconds, paused=false during playback, and no media error. No regeneration was required. Evidence: `backend/storage/explainer-playback-verification.json`.
- Backend regression suite: **50 passed**, including owner-only media access, 206 byte-range delivery, and no advertised player URL while audio muxing is incomplete. Frontend production build: **passed**. The launcher now waits for backend readiness before restarting the frontend.


## Full AI activation — 2026-11-14 (current result)

**All eight live checks passed using real Gemini responses, plus 47 backend regression tests and the frontend production build.** Earlier failure records below are historical and superseded by this verification.

| Feature | Actual result |
|---|---|
| Landing-page chat | Real, unauthenticated AI preview over an ORAYA-authored sample transcript; free-form input and source links verified in the browser. Canned replies removed. |
| Lecture tutor | Live generated explanation with actual transcript citations (`mode: gemini`). |
| Summary notes | HTTP 201, live AI output; 2.82 seconds in the final check. |
| Chapter notes | HTTP 201, live AI output; 2.28 seconds. |
| Definitions | HTTP 201, live AI output; 17.44 seconds. |
| Quizzes | HTTP 201, three live-generated questions, correct requested count; 1.49 seconds. |
| Embeddings | Real `gemini-embedding-001` request passed, 3072 dimensions. |
| AI explainer | Gemini-generated five-scene plan, actual completed 69-second MP4 with H.264 1920x1080 video and AAC narration. Full decode passed; audio peak -4.0 dB; both streams and all scene boundaries aligned exactly in this run. |

The local `.env` had a case-insensitive `gemini_model=gemini-3.8-flash` override, which kept notes/quizzes/video on the failing model even after a code-default change. Corrected that local override and set both generation and chat defaults to `gemini-3.1-flash-lite`. Real JSON generation is now verified. Credentials remain in ignored server-side environment configuration.

The old frontend listener used IPv6 `::1` while the displayed URL used IPv4 `127.0.0.1`. The frontend, backend proxy and launcher now use matching addresses. `start-oraya.ps1` starts hidden background servers, adds FFmpeg to PATH, and supports a project-verified restart. Backend runs without a reloader that could interrupt scene rendering.

AI requests have bounded output budgets and transient-error retries. Truncated provider output is rejected, and fallback content is never labelled as AI-generated. Health/status now distinguish credentials being configured from the last actual successful response.

Approved rendering templates now wrap long text, keep readable font sizes, center comparison text inside its cards, preserve complete summary text, and avoid floating-point frame loss. All seven updated templates rendered successfully; the final AI video was visually inspected and revalidated after these fixes.

Evidence: `backend/storage/ai-full-verification/report.json`, per-feature JSON responses in that directory, `jobs/1/explainer.mp4`, `jobs/1/media-verification.json`, and `docs/screenshots/live-ai-preview.jpg`. The test database is isolated from existing application notes, quizzes and lectures. Landing tool animations are labelled as illustrative previews and link to real lecture workflows.


## Tutor accuracy and runtime fix — 2026-11-14

- Reproduced the reported `Explain Avengers in simple terms?` failure against lecture 4. Its captions were already loaded; instructional words caused the keyword gate to discard a real subject match. Title-topic questions and whole-video summaries now select representative transcript context.
- The old port-8000 server was still running previously imported code/configuration and reported demo mode with missing renderer tools. Restarted the inspected ORAYA process in the configured virtual environment. Its health now reports Gemini enabled and both Manim/FFmpeg available.
- The chat model is separately configurable with `GEMINI_TUTOR_MODEL`, defaulting to `gemini-3.1-flash-lite`. Google documents this model for low-latency tasks and summarization: https://aistudio.google.com/docs/models/gemini-3.1-flash-lite. At that stage, other AI features retained `GEMINI_MODEL=gemini-3.8-flash`; the current configuration above supersedes this.
- A real direct Flash-Lite request and the actual application's Avengers tutor request both returned generated explanations with source timestamps (`mode: gemini`). Evidence: `backend/storage/tutor-verification-lite.json` and `backend/storage/tutor-verification.json`. Intermittent upstream timeouts were also observed during follow-up checks; these produce explicitly labelled transcript excerpts.
- Preserved current-session user questions in frontend history, resolved chains of follow-ups to their original topic, used persisted conversation history when the client omits it, and returned the latest 100 messages rather than the oldest 100.
- Exact transcript matches use local retrieval before external embeddings. Embedding fallbacks have bounded waits and a cooldown after failures. Matched quotes now identify their actual caption position rather than the start of a large passage.
- Tutor replies validate source timestamps, including grouped/range citations, and return only cited references. Missing support no longer triggers misleading transcript-upload advice. Live/generated replies and transcript-only fallbacks are labelled separately in the UI.
- Interactive generation is bounded to 35 seconds per request and 800 output tokens. Backend regression suite: **41 passed**. Frontend production build: **passed**. A live follow-up (`Why are they fighting?`) also succeeded through the app, with matching references; evidence: `backend/storage/tutor-followup-ui-verification.json`. The isolated route diagnostic in `tutor-followup-verification.json` also passed and rolled back all test chat writes. Screenshot: `docs/screenshots/tutor-fixed.jpg`. The configured backend is left running without the development reloader so generated scene files cannot interrupt jobs. Legacy transcript-only replies are excluded from model conversation context, while user questions are retained. Timestamp validation normalizes equivalent zero-padded formats and keeps malformed timestamps invalid.

## Dashboard UI refresh — 2026-11-14

- Reworked the dashboard around a featured lecture, compact statistics, practice shortcuts, next steps, and separate activity/mastery insights. Retained the existing API data and warm ORAYA design direction.
- Fixed real 0% quiz averages displaying as missing. Progress insights can fail independently without hiding the lecture dashboard; added loading placeholders and clearer empty states.
- Updated shared navigation with active states, four equal mobile tabs, an always-available add-lecture action, skip-to-content, and Escape/focus handling for the account menu. Activity bars support keyboard arrows, Home/End, and announced daily counts.
- Verified with real demo-account data in the browser: featured lecture navigation, add-lecture navigation, activity selection and arrow keys, account menu dismissal/focus return, desktop layout, and no horizontal overflow at 320px/390px. A fresh reload produced no console errors. Frontend production build passed.
- Screenshots: `docs/screenshots/dashboard-desktop.jpg` and `docs/screenshots/dashboard-mobile.jpg`. Local preview: `http://127.0.0.1:5173/dashboard`.

_Last updated: 2026-11-14 (Phase 0.5 environment and rendering verification)_

## Environment

| Tool | Status |
|------|--------|
| Node.js 24.20 / npm 11.19 | ✅ available |
| Python 3.14 | ✅ available (`python` on PATH; no `python3` alias) |
| FFmpeg / ffprobe | ✅ portable binaries in `.tools/bin/ffmpeg`; `backend/activate.ps1` adds them to the project shell PATH; version N-128889-g88c46fce27-20261113 |
| Manim CE | ✅ 0.22.1 installed in `backend/.venv`, verified on Python 3.14.10 (Requires-Python >=3.11) |
| Git 2.48 | ✅ available (repo not yet initialized/committed) |
| GEMINI_API_KEY | ✅ loaded from ignored `backend/.env`; never in source or browser. Real structured + text generation verified on `gemini-3.1-flash-lite` (see top section). |

## Verification status

| Check | Result |
|-------|--------|
| Backend test suite (`pytest -q`) | ✅ **50 passed** (5.2 s, offline demo mode — restored by removing root-level scratch `test_*.py` files that pytest collected first) |
| Frontend production build (`npm run build`) | ✅ passing (Vite 8.3.8 → `frontend/dist`, 391.55 KB JS / 33.67 KB CSS) |
| Historical MVP end-to-end smoke (uvicorn + live HTTP) | ✅ **17/17 steps** — health, meta, login, lectures, transcript (34 segs/7 chapters/timed), search, tutor (demo + 3 refs), notes + PDF export, quiz generate/attempt, progress, flashcards + review, watch progress, bookmarks create+delete, explainer job (`render_skipped`, 4 scenes, template source), dashboard, 401 on unauthorized |
| Historical dev server + proxy (`vite dev` → `:8000`) | ✅ app HTML served, `/api/v1/health` proxied OK |
| Live Gemini call | ✅ `POST /lectures/{id}/tutor/ask` → HTTP 200 in 4.5 s, `mode: gemini`, transcript citations — on `gemini-3.1-flash-lite` (2026-11-14). Earlier direct call: `ORAYA connection verified.` |
| Manim MP4 render | ✅ actual 1080p60 H.264 MP4 + AAC narration generated, fully decoded without errors; final evidence below. |

---

## Feature checklist

### A. Smart YouTube Learning
- [x] URL validation + video ID parsing (watch/youtu.be/shorts/embed/live/nocookie + bare ID)
- [x] oEmbed metadata (title/channel/thumbnail) + best-effort duration probe
- [x] Video embed (YouTube IFrame API) with embed-disabled fallback link
- [x] Transcript retrieval attempt (`youtube-transcript-api`, optional/best-effort)
- [x] Transcript upload (`.srt` / `.vtt` / `.txt`), size + type validation
- [x] Timestamp-synced segments (never invented — untimed TXT flagged `timed: false`)
- [x] Auto chapters + topics (keyphrase-driven, derived from transcript)
- [x] Transcript search (retrieval-backed, ranked results)
- [x] Bookmarks (create at current playback time, seek, delete)

### B. AI Tutor
- [x] RAG over transcript segments (TF-IDF offline / Gemini embeddings when keyed, lexical gate)
- [x] Context-aware answers with clickable timestamp references
- [x] Follow-up support (history passed to model) + suggestion chips
- [x] Honest "not covered in this lecture" behaviour (tested)
- [x] Chat history persisted per lecture
- [x] Demo-mode fallback (extractive, labelled, tested)

### C. Personalized AI Video Generator
- [x] Concept identification available via topics/chapters; concept entered by student
- [x] Script + scene-plan generation (structured JSON, JSON-schema constrained when keyed)
- [x] Approved Manim template rendering only — allow-list validation, no arbitrary code exec
- [x] Async job queue with persisted stages/progress + frontend polling
- [x] Narration (gTTS) + FFmpeg mux when available; graceful `render_skipped` otherwise
- [x] Downloads: MP4 / Manim source / script / plan / narration

### D. AI Notes
- [x] Summary / chapter-wise / definitions generation (Gemini + extractive fallback)
- [x] Timestamped content derived from transcript
- [x] Markdown + PDF export (reportlab), edit & delete

### E. AI Quiz Engine
- [x] MCQ + short-answer, easy/medium/hard/mixed
- [x] Auto-grading (exact-normalized MCQ, keyword-recall short answer) + explanations
- [x] Knowledge-gap identification + mastery write-back per topic
- [x] Quiz history

### F. Personalized Learning
- [x] Topic mastery tracking (weighted rolling average)
- [x] Weak-concept detection (<60%) + revision recommendations
- [x] Flashcards generated from lecture keyphrases
- [x] Spaced repetition (SM-2-style ease/interval, due queue, quality buttons)
- [x] Watch progress persistence + resume

### G. Dashboard & Platform
- [x] Auth (signup/login/JWT, profile + onboarding wizard, demo account)
- [x] Dashboard: stats, recent lectures, recent attempts, 14-day activity chart (real events only)
- [x] Library: search, filter, delete, transcript status badges
- [x] Progress page: mastery bars, weak spots, recommendations, totals, quiz history
- [x] Responsive layouts (mobile nav, stacked workspace ≤1024px, ≥44px touch targets)
- [x] Accessibility: focus-visible rings, aria labels/roles, error summaries with focus move,
      reduced-motion support, color never sole indicator
- [x] Loading / error / empty states on every async surface
- [x] Production build config (`vite build` → `dist/`)
- [x] Deployment docs (README: Vercel + Render + Supabase)

### H. Landing page (`/`, logged out)
- [x] Editorial landing ported from the stakeholder's approved HTML: sticky scroll acts
      (video → concept map, idea → video pipeline), particle hero + 3D book, scripted
      tutor chat (labelled frontend demo), polymer 3D canvas, notes/flashcard/quiz/
      constellation tools, finale + footer
- [x] Route-scoped CSS (`landingCss.js` in a `<style>` tag) — no leakage to app routes
      (verified: `/login` renders clean after navigating away)
- [x] Behavior in `landingScript.js` with full cleanup — StrictMode double-mount safe
      (verified: single sets of tiles/messages/quiz buttons)
- [x] Auth CTAs wired to `/signup` + `/login`; fonts consolidated in `index.css`
- [x] Responsive (390×844: no overflow, nav collapses, single-column grids)
      and `prefers-reduced-motion` respected

### Docs
- [x] `docs/PROJECT_STATUS.md` (this file)
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/API_DOCUMENTATION.md`
- [x] `docs/DEVELOPMENT_LOG.md`
- [x] `docs/KNOWN_ISSUES.md`
- [x] `README.md` (root)

---

## Pending / next session

- [ ] Live end-to-end smoke test (signup → onboarding → sample lecture → tutor/notes/quiz/explainer)
- [x] Successful live Gemini text response
- [x] Gemini-scripted explainer: real JSON generation and a narrated 69-second MP4 verified
- [x] Manim + FFmpeg actual MP4 render, narration mux, and technical synchronization checks
- [ ] Git init + first commit
- [ ] Alembic migrations · Supabase Auth swap · pgvector retrieval · dedicated job worker
      (documented in ARCHITECTURE, deferred deliberately)

## Phase 0.5 verified changes

- Node.js 24.20.0 and Python 3.14.10 inspected; retained the existing working Python environment. Manim CE 0.22.1 supports Python >=3.11, including 3.14: https://pypi.org/project/manim/.
- `ffmpeg -version`, `manim --version`, and `pip check` pass after activating `backend/activate.ps1`. Optional installation is reproducible with `python -m pip install -r requirements-render.txt`. Click 8.1.8 / Cloup 3.0.8 resolve the gTTS dependency conflict.
- Current official documentation confirms `gemini-3.8-flash` and structured JSON output support: https://aistudio.google.com/docs/models/gemini-3.8-flash. Model retained. A diagnostic request to `gemini-3.6-flash` also returned 504. The original real 3.8 Flash text request succeeded after retries; evidence: `backend/storage/phase05/live-text-success.json`. Current SDK calls have a 120-second per-request timeout and at most three attempts.
- `.env` loading is anchored to the backend directory; environment variables retain precedence. Credentials are never printed by the verification script.
- Fixed `LaggedStartmap` -> `LaggedStartMap`, scene clearing, missing-LaTeX formula fallback, absolute render paths, final-output selection (excluding partial clips), and Windows file replacement.
- Narration is synthesized per scene, measured, padded to the scene duration, and joined before rendering. Animation durations include transitions. Mux failures fail the job; only successfully muxed output reports narration. `generation.json` records actual script mode.
- All seven approved templates rendered to MP4 at 480p15. Formula rendering uses plain Text on this machine because LaTeX/dvisvgm are absent. Arbitrary model-authored code remains prohibited.
- Backend: **31 passed**. Frontend: `npm run build` passed. Rendering verification uses an isolated database under `backend/storage/phase05`, preserving application data.

To activate the local runtime from the repository root:

```powershell
. ./backend/activate.ps1
python verify_phase05.py
# Or run the application:
python -m uvicorn app.main:app --reload
```

The rendering script makes real network calls and writes actual media; it is separate from the offline API test suite. The API artifact test explicitly exercises the missing-renderer fallback for deterministic offline regression coverage.

### Actual media evidence (Phase 0.5)

- Completed pipeline job **2**, concept **Newton's second law**, actual output: `backend/storage/phase05/jobs/2/explainer.mp4` (44 seconds; H.264 1920x1080 at 60 fps; AAC narration).
- `backend/storage/phase05/jobs/2/media-verification.json` records a full FFmpeg decode with no errors, audio peak **-3.7 dB**, both streams starting at **0**, and audio/video duration difference **0.016667 seconds**.
- Scene boundaries were reconstructed from Manim's ordered rendered partial clips and compared with the measured narration timeline. Maximum offset: **0.016667 seconds**. All four spoken sections fit within their corresponding rendered scene. This is technical synchronization verification, not a claim of subjective listening evaluation.
- A rendered frame was visually inspected after correcting template text encoding. The seven-template test MP4 is `backend/storage/phase05/media/videos/templates/480p15/OrayaExplainer.mp4`.
- Job 2's script mode was **demo**, because the structured Gemini request returned 504. It verifies real video and narration rendering, while the separate successful text request verifies live Gemini connectivity.
- Reproduce the media inspection in an activated shell: `python verify_video_output.py storage/phase05/jobs/2`.

- HTTP verification against the isolated application database: login, completed job status, MP4 download, and renderer status all returned **200**. MP4 response size **2,410,493 bytes** exactly matched job 2's file. Renderer reported `{manim: true, ffmpeg: true}`. Evidence: `backend/storage/phase05/http-verification.json`.
- Final structured-script retry run (three bounded SDK attempts) still returned **504 DEADLINE_EXCEEDED** and selected the existing demo fallback. Successful Gemini text connectivity is verified; successful Gemini JSON explainer generation remains unsuccessful in this session. No further model generation requests are required to reproduce the completed MP4/media checks.

- Final pipeline job **3** also completed with narration; `backend/storage/phase05/jobs/3/explainer.mp4` passed the same full decode, non-silent audio, and scene-boundary tests (44 seconds; maximum offset 16.7 ms). `generation.json` explicitly records `script_mode: demo`. The final machine-readable evidence is `backend/storage/phase05/summary.json` and `report-3.json`.

**Earlier Phase 0.5 outcome (superseded above):** Python/Node inspection, local environment loading, FFmpeg, Manim, seven approved templates, real Gemini text request, real MP4 rendering, narration, technical synchronization, dependency validation, backend tests, frontend build, and completed-file HTTP download all passed. Structured Gemini explainer generation did not succeed because of upstream 503/504 responses despite bounded retries. LaTeX is optional and remains uninstalled; formulas render with the approved Text fallback.

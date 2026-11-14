# ORAYA — Development Log

Chronological record of build sessions. Every claim here was executed and verified.

---

## Session 1 — greenfield build (2026-01-14)

### Phase 0 — repository inspection
- Inspected `D:\New folder`: empty except `.opencode/skills` → greenfield project.
- Tooling check: Node 24.20 / npm 11.19, Python 3.14 (`python` on PATH, no `python3`),
  Git 2.48. **ffmpeg missing** (recorded in KNOWN_ISSUES).
- Resolved two blocking decisions with the stakeholder:
  1. **Design direction** → follow the attached product mockup (light cream/coral/sage),
     superseding §7's dark-navy text.
  2. **No Gemini key** → full env-based Gemini wiring + deterministic demo fallback.

### Phase 1 — design system + docs
- Generated design system via `ui-ux-pro-max` (`--design-system` + typography/landing/ux
  domain searches), persisted to `design-system/ORAYA/MASTER.md`.
- Verified current package/model versions from official sources (rule 17):
  - `google-genai` **3.3.0** (PyPI), chat model `gemini-3.8-flash`,
    embeddings `gemini-embedding-001`, structured output via
    `response_mime_type="application/json"` + `response_json_schema`.
  - npm registry: vite 8.3.8, @vitejs/plugin-react 6.3.0, tailwindcss 4.3.5,
    react 19.3.1, react-router-dom 7.18.5, lucide-react 1.72.0.
- Wrote `docs/ARCHITECTURE.md`, `docs/API_DOCUMENTATION.md`, `docs/PROJECT_STATUS.md`.

### Phase 2 — backend (FastAPI)
- Core: `config.py` (pydantic-settings), `database.py` (engine/session/lifespan),
  `models.py` (16 tables incl. `watch_progress`), `schemas.py` (Pydantic contract),
  `security.py` (PBKDF2-HMAC-SHA256 240k + PyJWT HS256), `deps.py`, `main.py`
  (lifespan startup/seed, CORS, global 500 handler, `/health`, `/meta`).
- Routers (31 endpoints): `auth`, `lectures` (CRUD, transcript get/upload/search, topics,
  bookmarks), `tutor` (ask/suggestions/history), `notes` (generate/CRUD/export md+pdf),
  `quiz` (generate/take/grade/history + mastery write-back), `learning` (watch progress,
  overview, flashcards + SM-2-style review), `videos` (explainer jobs, polling, downloads),
  `dashboard`.
- Services: `youtube.py` (URL/ID validation, oEmbed metadata, duration probe),
  `transcript.py` (SRT/VTT/TXT parsers, chaptering, keyphrases),
  `rag.py` (TF-IDF cosine default, Gemini embeddings when keyed, lexical gate),
  `ai.py` (single Gemini gateway, `mode: gemini|demo`, JSON-schema constrained output),
  `demo_ai.py` (extractive tutor/notes/quiz/script engine — transcript-derived only),
  `manim_templates.py` (allow-list scene-plan validation + template-only Manim source,
  `compile()` syntax check, no model-authored execution),
  `video_jobs.py` (async job pipeline with persisted stage/progress),
  `export.py` (reportlab PDF), `lecture_service.py`, `seed.py` (demo account + sample lecture).
- Dependency resolution fixed against live PyPI metadata: `fastapi==0.162.7`,
  `pydantic==2.14.3`, `pydantic-settings==2.16.3`, `sqlalchemy==2.1.8`,
  `google-genai==3.3.0`, `httpx==0.28.1` (google-genai v3 ships `httpx2`, not `httpx`),
  `youtube-transcript-api==1.2.5` (1.2.x pre-releases excluded Python 3.14),
  `reportlab==5.1.0`, `pytest==9.2.0`.

### Phase 3 — test suite (31 tests, all green)
Iterated to green through real bug fixes found by the suite:
1. `ModuleNotFoundError: app.services.config` → relative imports corrected to `..config`.
2. Missing `httpx` → added to requirements.
3. SRT timestamps parsed as `0.0` → rewrote `_hms_to_sec()` (split-based, no fragile regex).
4. Deprecated `on_event("startup")` → `lifespan` contextmanager.
5. Deprecated `HTTP_422_UNPROCESSABLE_ENTITY` / `HTTP_413_REQUEST_ENTITY_TOO_LARGE` →
   `HTTP_422_UNPROCESSABLE_CONTENT` / `HTTP_413_CONTENT_TOO_LARGE`.
6. Test fixture signed up a fresh user (no sample lecture) → feature tests now log in as the
   seeded demo account; added explicit signup/login/409 roundtrip test.
7. Over-eager retrieval: unrelated questions matched on shared stop-words →
   added lexical gate in `rag.py` (min shared content words) and stop-word-filtered
   `_content_tokens()` in `demo_ai.py`.
8. `QuestionOut.model_validate(orm)` failed (Pydantic v2 strict) → explicit field construction.
9. Invalid escape `\-` in generated Manim source → allow-list check fixed.

**Result: `31 passed in 2.09s`.**

### Phase 4 — frontend (React 19 + Vite + Tailwind v4)
- Scaffold: `package.json` (registry-verified versions), `vite.config.js` (dev proxy
  `/api` → `:8000`), `index.html`, `.env.example`, `src/index.css` (design tokens + component
  classes from `MASTER.md`, reduced-motion support, focus-visible rings).
- Foundations: `lib/api.js` (fetch wrapper, bearer token, 401 event, blob downloads),
  `context/AuthContext.jsx`, `components/ui.jsx` (Button/Chip/Field/Badge/ProgressBar/
  Loading/ErrorState/EmptyState/Markdown), `Logo.jsx`, `AppShell.jsx` (responsive nav,
  account menu), `VideoPlayer.jsx` (YouTube IFrame API loader, seek ref, time callback,
  embed-disabled fallback).
- Pages: `Landing`, `Login`, `Signup`, `Onboarding` (3-step mockup replica),
  `Dashboard`, `NewLecture`, `Library`, `Flashcards`, `Progress`,
  **`LectureWorkspace`** (video + transcript panel with search/bookmarks/chapters/upload,
  tabs: Tutor chat with timestamp citations · Notes generate/edit/export · Quiz
  generate/take/grade with explanations · Explainer job creation with live polling,
  watch-progress reporting every ~10s + flush on leave).

### Phase 5 — verification
- Backend: `pytest -q` → **31 passed**.
- Frontend: `npm run build` (vite production build) → 2105 modules, 373 KB JS (gzip 111 KB),
  36 KB CSS (gzip 7.7 KB).
- **Live smoke test (uvicorn on :8000, demo account) — 17/17 PASS:** health/meta (ai_mode=demo),
  login, lectures, transcript (34 segments / 7 chapters / timed), transcript search (5 hits),
  tutor (mode=demo, 3 timestamp refs), summary note + PDF export (2.8 KB), quiz
  generate + attempt (scored, gaps detected), progress overview (streak/mastery/recs),
  flashcards generate (6) + review (interval 1.0d), watch progress, bookmark
  create + delete, explainer job (queued → `render_skipped` with 4 validated scenes,
  Manim template source 6.7 KB), dashboard stats/activity, 401 on unauthorized request.
  **Bug found & fixed during smoke:** `DELETE` bookmark URL was documented/implemented at
  `/bookmarks/{id}` in docs + frontend while the router serves `/lectures/bookmarks/{id}` —
  docs and frontend corrected to match the tested route.
- **Dev-server check:** `vite dev` serves the app shell (ORAYA title present) and proxies
  `/api/v1/health` → backend `ok`.

---

## Session 2 — landing page port (2026-11-14)

Stakeholder supplied a complete standalone editorial landing page (Instrument Serif +
DM Sans, ivory `#F7F5EF`, forest `#344C3D`, scroll-driven sticky acts) and asked for it
to become the `/` route.

### Approach
- `frontend/src/pages/landingCss.js` — the original CSS kept verbatim in one string,
  rendered by `Landing.jsx` as a route-scoped `<style>` tag (removed on unmount, so app
  routes are unaffected). Small integration additions: `.nav-actions` / `.nav-login`
  (login + signup CTAs), `.card { box-shadow: none }`.
- `frontend/src/pages/Landing.jsx` — full markup converted to JSX; script-owned
  containers (`#ln #bds #cs #ms #ch #vs #qz`) render empty and are filled by the script.
  Auth CTAs are `<Link>`s to `/signup` / `/login`; in-page anchors stay `#hash`.
- `frontend/src/pages/landingScript.js` — the original vanilla script ported to
  `initLanding(root)`, returning a cleanup fn. Every listener/timer/rAF/observer is
  registered through helpers that record teardown; containers are reset at init so a
  React StrictMode double-mount (or a route re-entry) never duplicates tiles, storyboard
  cards, chat messages or quiz buttons.
- Fonts consolidated into the single `index.css` Google Fonts import (DM Sans +600,
  `Instrument+Serif:ital@0;1`); `index.html` keeps preconnects only. Title set to
  `Oraya: Don’t just watch. Understand.`

### Honesty constraints preserved
- Tutor demo keeps the visible label *"Frontend demo: replies are scripted, not live AI."*
- No fabricated transcript/timestamps: the demo's timestamps belong to its scripted
  sample video, not to any real YouTube lecture.

### Verification (all executed)
- `npm run build` → green; output stable across repeat builds (33.7 KB CSS / 391 KB JS,
  gzip 7.4 / 119 KB). **Found + fixed:** Tailwind v4 was scanning the previous `dist/`
  as a source, causing CSS to drift between builds — added root + `frontend/.gitignore`
  (`dist/`, `node_modules/`), builds now byte-identical.
- Headless Edge DOM dump of `/`: exactly 6 tiles, 4 fragments, 3 quiz buttons, 6
  storyboard cards, 1 initial chat message, 1 chip, correct title, no JS errors
  (proves StrictMode idempotency).
- CDP interaction tests: quiz wrong→*"Gap spotted…"*, right→*"Nice…"* + 2 stars lit;
  flashcard flips; chat types through, emits clickable timestamp (seeks player to 40%)
  and follow-up chip; scroll acts update captions/steps/tiles, storyboard reveals
  6/6, timeline fills, notes observer fires, polymer canvas paints pixels.
- `/login` after navigating away from `/`: landing `<style>` gone, `#nav` gone,
  body background back to app cream → **no style leakage**.
- Mobile (390×844): no horizontal overflow, nav `<ul>` hidden, hero/tools/tutor
  single-column, scroll act works, login CTA visible.
- Backend re-run: `pytest -q` → **31 passed**; `/api/v1/health` → ok (demo mode).

---

## Phase 0.5 completion — live AI + rendering (2026-11-14)

- **Environment re-verified:** Node 24.20.0, Python 3.14.10 (`backend/.venv`),
  `ffmpeg -version` → `N-128889-g88c46fce27-20261113`,
  `manim --version` → `Manim Community v0.22.1`, `google-genai` 3.3.0, `pip check` clean.
- **`renderer_status()` fix:** `.env` declared `ffmpeg_bin_path`/`ffprobe_bin_path` but
  `config.py` ignored them (`extra="ignore"`) and the status check only consulted `PATH`,
  so a backend restarted from an older shell reported `ffmpeg:false`. Added both as real
  `Settings` fields and prepend their directory to `os.environ["PATH"]` at config import —
  `shutil.which`, pydub and the FFmpeg mux subprocess now resolve the same binaries from
  any launch context. Added the missing `Path` import in `manim_templates.py`
  (`NameError` crashed `/health` once). Health now reports `{manim:true, ffmpeg:true}`.
- **Root `/health` alias:** added `@app.get("/health")` alongside `/api/v1/health` for
  uptime probes (Render/load balancers). Traced the repeated 404s to an external
  OpenAI-style endpoint scanner hitting `/health` + `/v1/models` — no app code polls them;
  `/health` now answers 200, `/v1/models` remains an intentional 404.
- **Real Gemini evidence:** `POST /api/v1/lectures/1/tutor/ask` → HTTP 200 in 4.5 s,
  `mode: gemini`, answer citing `[1:20, 1:30]`. Prior full-suite report
  (`storage/ai-full-verification/report.json`) shows all eight AI features on `mode: gemini`.
- **Explainer through the live pipeline (job 4, API-created):** `completed`,
  `stage: Completed with narration`, `script_mode: gemini`. Artifacts: plan/script/scene.py/
  narration + `generation.json` = `{"script_mode":"gemini","model":"gemini-3.1-flash-lite"}`.
- **MP4 verification (job 4):** `explainer.mp4` 3.07 MB — H.264 1920×1080 @60 fps and
  AAC 24 kHz mono, both streams exactly 67.000 s; `volumedetect` mean −19.6 dB,
  max −4.0 dB (real speech); `timing.json`'s five scene narrations sum to 67 s = video
  duration, each clip inside its scene window (A/V sync by construction).
- **Explainer from the user's UI (job 5):** completed with a real 2,165,744-byte MP4;
  `GET /video-jobs/5/download?kind=mp4` → 200 through the workspace player.
- **`video_url` double-prefix fix:** the API returned `/api/v1/...` while the frontend
  helper prepends `api.baseUrl` (`/api/v1`) again → `/api/v1/api/v1/...` 404. Made
  `video_url` relative to the API base; player still fetches it as an authenticated blob.
- **Test isolation fix:** scratch files (`backend/test_gemini.py`, repo-root
  `test_full_gemini.py`, `test_google_import.py`, `test_gemini_integration.py`) matched
  pytest's `test_*.py` pattern, imported `app.config` before `tests/test_api.py` forced
  `GEMINI_API_KEY=""`, and cached the real key → 7 failures asserting demo mode. Deleted
  them. `pytest -q` → **50 passed** in 5.2 s (offline, demo mode). `npm run build` → passed.
- Left running: backend uvicorn on `127.0.0.1:8000` with the fixed code, Vite on `5173`.

---

## Flashcard creation & review fixes (2026-11-14)

Reported: no visible way to generate flashcards, switching filters could leave the previous
answer on screen, and the filter counters tracked the review queue instead of saved cards.

- **Generation entry point:** `/flashcards` renders the "Create cards from a lecture"
  form with a **Generate flashcards** button whenever a transcript-ready lecture exists
  (nav: `AppShell → Flashcards`; dashboard "Review flashcards" links here too).
  Verified in a real browser: button visible and enabled, 5 lecture options offered.
- **Filter switch resets the reveal:** `switchView()` clears `showingAnswer`, the reviewed
  set and any review error before changing `view` (and is blocked mid-review via
  `reviewLock`/`disabled`), so a revealed back never follows the user into another filter.
- **Counters show saved cards:** filter buttons read `stats.due` / `stats.total` from
  `GET /flashcards/stats` (server counts over the `flashcards` table), while the queue
  badge is explicitly labelled "N left in this queue".
- **Backend loaded:** the port-8000 server predated the `learning.py`/`schemas.py` edits
  (started 06:29, edits 06:57) and was restarted so live traffic hits current code.
- **Regression test strengthened:** `test_flashcards_generate_and_review` now asserts that
  stats count the saved deck (`total`/`due` match `?due=false`/`?due=true`), that a
  `quality:3` review keeps `total` unchanged while dropping `due` by exactly 1, and that
  the reviewed card leaves the due list. `pytest -q` → **50 passed**; `npm run build` → passed.
- **Live browser verification (headless Edge + CDP, saved under `frontend/tests/`):**
  - `flashcards-ui-check.mjs` → **9/9**: page renders, generate button visible, counters
    `Due (9) All (11)` == API stats, answer reveals, filter switch hides it, no leak onto
    the next card, UI review saves (`Due 9 → 8`), no console errors.
  - `flashcards-ui-e2e.mjs` → full flow: create via the button (11 → 12 saved, counters
    match server), review via the quality buttons (`Due 9 → 8`, total unchanged), reload →
    counters still `Due (8) All (12)`, reviewed card rescheduled to `2026-11-15` with
    `interval=1.0` confirmed through the API.

---

## FFmpeg PATH resolution hardened (2026-11-14)

The backend restarted during the flashcard session reported `ffmpeg: false` even though the
fixes from earlier in the morning were in place. Root cause: `.env` (edited 05:58) stores
`ffmpeg_bin_path` as the **directory** `…\.tools\bin\ffmpeg`, while `config.py` appended its
*parent* (`…\.tools\bin`, which contains no binaries) to `PATH`; `ffprobe_bin_path` pointed at
`…\.tools\bin\ffprobe`, which does not exist (the real `ffprobe.exe` sits inside the ffmpeg
folder). Compounding it, the agent shell's inherited PATH predates the user-PATH install, so
`shutil.which` could not compensate.

- `config.py` now resolves each configured value to the directory that actually contains the
  binaries — accepting the executable itself, an exe-less file path, or the folder — and skips
  values that resolve to nothing on disk. `manim_templates._ffmpeg_available()` applies the
  same directory-aware fallback.
- `ffprobe_bin_path` corrected to `…\.tools\bin\ffmpeg\ffprobe.exe`; the `.env` BOM introduced
  during the rewrite was stripped (first bytes `47 45 4D`).
- Verified from a shell **without** FFmpeg on PATH: `/health` → `{manim:true, ffmpeg:true}`,
  `shutil.which` resolves both executables, `pytest -q` → **50 passed**, and a live Gemini
  tutor call after the `.env` rewrite returned `mode=gemini` (health → `gemini: live`).

---

## Deferred items (documented, not broken)
- Live Gemini smoke test (needs a real `GEMINI_API_KEY`).
- Manim/FFmpeg render smoke test (needs system installs — ask before installing).
- Alembic migrations, Supabase Auth swap, pgvector retrieval, dedicated job worker.

# ORAYA

**AI-powered personalized learning space for video lectures.**
Paste a YouTube lecture → ORAYA builds a workspace around it: a context-aware AI tutor with
timestamped citations, generated notes (Markdown/PDF), adaptive quizzes with grading,
animated Manim explainers, flashcards with spaced repetition, and real mastery analytics.

> Light, warm, mockup-faithful design (cream / coral / sage). Dark theme intentionally out of
> scope — see [`design-system/ORAYA/MASTER.md`](design-system/ORAYA/MASTER.md).

---

## Feature highlights

| Area | What works today |
|------|------------------|
| **Smart YouTube learning** | URL/video-ID validation, public oEmbed metadata, best-effort transcript fetch, `.srt/.vtt/.txt` upload, timestamp-synced segments, auto chapters/topics, transcript search, bookmarks |
| **AI Tutor** | RAG over transcript (TF-IDF offline / Gemini embeddings when keyed), answers cite timestamps, follow-ups, suggestion chips, honest "not in this lecture" answers |
| **AI Notes** | Summary / chapter-wise / definitions, Markdown + PDF export, edit & delete |
| **AI Quiz** | MCQ + short answer, 3 difficulty levels, auto-grading with explanations, knowledge-gap detection, mastery write-back |
| **Explainer videos** | Concept → grounded script → validated scene plan → approved-template Manim source → async render job with live progress; downloads (MP4 / plan / Manim source / narration) |
| **Personalized learning** | Topic mastery, weak-concept detection, revision recommendations, flashcards with SM-2-style scheduling, streak + totals analytics |
| **Platform** | Email/password auth (PBKDF2 + JWT), onboarding wizard, dashboard, library, responsive & accessible UI |

**Demo mode (no API key required):** every AI surface has a deterministic, extractive fallback
operating strictly on real transcript text — responses are labelled `mode: "demo"`. Add a
`GEMINI_API_KEY` and the same endpoints switch to `mode: "gemini"` with no code changes.

**Bundled sample lecture:** a clearly-labelled ORAYA-authored transcript (`source="sample"`,
demo account `demo@oraya.app` / `oraya-demo-1`) so the entire product is explorable with zero
setup. No fabricated YouTube transcripts anywhere.

---

## Repository layout

```
├── frontend/            React 19 + Vite + Tailwind v4 + React Router + Lucide + YT IFrame API
├── backend/             FastAPI + Pydantic + SQLAlchemy (JWT auth, RAG, Gemini, job queue)
│   └── tests/           31-test API suite (pytest)
├── design-system/ORAYA/ MASTER design tokens (source of truth for UI)
└── docs/                PROJECT_STATUS · ARCHITECTURE · API_DOCUMENTATION ·
                         DEVELOPMENT_LOG · KNOWN_ISSUES
```

---

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
# → http://localhost:8000/api/v1/health
# → interactive docs: http://localhost:8000/api/docs
```

Optional `backend/.env` (copy from `.env.example`):

```ini
DATABASE_URL=sqlite:///./oraya.db        # or Supabase Postgres URL
JWT_SECRET=<long random string>
GEMINI_API_KEY=                          # leave empty → demo mode
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TUTOR_MODEL=gemini-3.1-flash-lite  # interactive tutor model
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
STORAGE_DIR=./storage
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
# → http://localhost:5173  (proxies /api → localhost:8000)
```

### 3. Tests & production build

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q        # 31 passed

cd ..\frontend
npm run build                                        # → frontend/dist
```

### Optional: full explainer rendering

On this Windows workspace, Manim CE and portable FFmpeg are configured. From the repository root:

```powershell
. ./backend/activate.ps1
python -m uvicorn app.main:app --reload
```

For a fresh rendering environment, install `backend/requirements-render.txt` and ensure
[FFmpeg](https://ffmpeg.org/) plus `ffprobe` are on PATH. `requirements-render.txt` pins
compatible Manim / gTTS / Click / Cloup versions. Without Manim, jobs retain their script,
scene plan, source and narration text and report `render_skipped`. Without TTS, rendered
videos are explicitly silent. Formula scenes use Text when LaTeX is unavailable.

`python verify_phase05.py` runs a real Gemini request, all seven approved templates, and
an isolated full explainer job. `python verify_video_output.py storage/phase05/jobs/<id>`
checks the actual MP4, audio signal, complete decoding, and rendered scene alignment.
See `docs/PROJECT_STATUS.md` for actual results and upstream Gemini availability caveats.

---

## Deployment

- **Frontend → Vercel:** build command `npm run build`, output `frontend/dist`, env
  `VITE_API_URL=https://<your-render-backend>/api/v1`.
- **Backend → Render:** web service, start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env vars from `backend/.env.example`
  (`DATABASE_URL` with `sslmode=require`, `JWT_SECRET`, `CORS_ORIGINS` = your Vercel domain).
  Use a persistent disk or Supabase Storage for `STORAGE_DIR` (generated MP4s/exports).
- **Database → Supabase Postgres:** set `DATABASE_URL`; schema is created automatically on
  first boot (`create_all`).

---

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Completed vs pending feature checklist |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, data model, AI/video pipelines |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Full REST contract (31 endpoints) |
| [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) | What was built session-by-session, bugs found & fixed |
| [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) | Real limitations (ffmpeg/Gemini/demo mode/etc.) |

---

## Security & compliance notes

- Gemini API key is **server-side only** — never bundled into frontend code.
- AI-generated Python is never executed: Manim source comes exclusively from our validated
  templates with allow-listed, length-capped data embedded as literals, syntax-checked only.
- All inputs validated with Pydantic; passwords PBKDF2-Hashed (240k iterations, per-user
  salt); JWTs HS256 with expiry.
- No fabricated transcripts, timestamps or AI results — demo mode is extractive and labelled.

## Start the configured local app

From the repository root in PowerShell, run `./start-oraya.ps1`. It starts the backend and frontend as hidden background processes and adds the local FFmpeg binaries to the backend PATH. Open http://127.0.0.1:5173. After changing backend code or `.env`, use `./start-oraya.ps1 -Restart`; the script only stops processes verified as this ORAYA project.

Both generation and tutor defaults are `gemini-3.1-flash-lite`. `backend/.env` overrides defaults, including case-insensitive setting names; keep `GEMINI_MODEL` and `GEMINI_TUTOR_MODEL` aligned with your intended model. The key remains server-side. `GET /api/v1/ai/status` reports the last actual generation result and its timestamp; configured credentials alone do not establish live API health.

`python verify_all_ai.py` from an activated backend environment runs real requests for landing chat, tutor, summary/chapter/definition notes, quizzes and embeddings, then renders and checks a narrated AI explainer in an isolated database. Latest complete evidence: `backend/storage/ai-full-verification/report.json`.

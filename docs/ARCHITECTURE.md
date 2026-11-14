# ORAYA — Architecture

## 1. High-level

```
┌──────────────────────────────┐        ┌─────────────────────────────────────┐
│  frontend/  React + Vite     │  HTTP  │  backend/  FastAPI (Python)         │
│  Tailwind v4 · React Router  │ ─────► │  /api/v1/*  · JWT auth · Pydantic   │
│  Lucide · YT IFrame API      │  JSON  │                                     │
└──────────────────────────────┘        │  ├─ services/youtube.py  metadata  │
                                        │  ├─ services/transcript.py         │
                                        │  ├─ services/rag.py      retrieval │
                                        │  ├─ services/ai.py    Gemini+demo  │
                                        │  ├─ services/video_jobs.py queue   │
                                        │  └─ services/manim_templates.py    │
                                        └──────────────┬──────────────────────┘
                                                       │ SQLAlchemy (DATABASE_URL)
                                        ┌──────────────▼──────────────────────┐
                                        │ Supabase PostgreSQL (prod)          │
                                        │ SQLite (local dev fallback)         │
                                        └─────────────────────────────────────┘

Gemini (google-genai SDK) ── used only server-side; key never reaches the browser.
Manim + FFmpeg ── worker subprocess, template-generated scripts only (no arbitrary code).
```

## 2. Repos layout

```
/ (repo root)
├── frontend/                 React + Vite + Tailwind v4 (JS, ESM)
├── backend/                  FastAPI app + tests + requirements.txt
├── design-system/ORAYA/      MASTER.md + page overrides
├── docs/                     PROJECT_STATUS, ARCHITECTURE, API_DOCUMENTATION,
│                             DEVELOPMENT_LOG, KNOWN_ISSUES
└── README.md
```

## 3. Backend layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routers | `backend/app/routers/*` | HTTP contract, validation, auth deps, status codes |
| Schemas | `backend/app/schemas.py` | Pydantic request/response models (single contract file) |
| Services | `backend/app/services/*` | Business logic: YouTube, transcript, RAG, AI, video jobs |
| Models | `backend/app/models.py` | SQLAlchemy ORM |
| Core | `config.py`, `database.py`, `security.py` | env config, engine/session, JWT + password hashing |

Rules enforced in code:
- All AI calls go through `services/ai.py`, which returns `mode: "gemini" | "demo"`.
- Demo mode is **extractive**, operating strictly on real transcript text (nothing fabricated).
- Long work (video render) runs through `services/video_jobs.py` (asyncio task queue, DB-persisted job rows).
- Generated Manim code is produced only by string templates with whitelisted, length-limited fields (`manim_templates.py`), validated by regex allow-list before execution. No `exec` of model output.

## 4. Data model (core tables)

- `users` — id, email, password_hash, name, grade, language, subjects(JSON), created_at
- `lectures` — id, user_id, video_id, url, title, channel, thumbnail, duration, source(`upload`/`fetched`/`sample`), transcript_status, created_at
- `transcript_segments` — id, lecture_id, idx, start, end, text
- `chapters` — id, lecture_id, idx, title, start
- `bookmarks` — id, lecture_id, ts, label
- `notes` — id, lecture_id, kind, title, content_md, created_at
- `quizzes` — id, lecture_id, config(JSON), created_at
- `quiz_questions` — id, quiz_id, idx, type, prompt, options(JSON), answer, explanation, topic, difficulty
- `quiz_attempts` — id, quiz_id, user_id, score, results(JSON), created_at
- `topics` — id, lecture_id, name — and `topic_mastery` (user_id, topic_id, score, updated_at)
- `flashcards` — id, lecture_id, topic, front, back, ease, interval, due_at
- `video_jobs` — id, lecture_id, concept, complexity, status, progress, scene_plan(JSON), script, video_path, error, created_at
- `tutor_messages` — id, lecture_id, role, content, refs(JSON)

## 5. Auth

- Email + password (PBKDF2-HMAC-SHA256, 240k iterations, per-user salt) → HS256 JWT (30 days) via `PyJWT`.
- `Authorization: Bearer <token>`; `get_current_user` dependency on protected routers.
- Supabase Auth can replace this later: the frontend only ever stores/attaches a bearer token, so swapping the issuer is contained to `security.py`.

## 6. AI pipeline

```
question → rag.retrieve(lecture, query, k=6)   # TF-IDF cosine (no key) or Gemini embeddings (key)
        → build grounded prompt w/ numbered segments + timestamps
        → ai.complete_json/text()
             ├─ GEMINI_API_KEY set → google-genai client.models.generate_content(
             │       model=env GEMINI_MODEL (default gemini-3.8-flash),
             │       response_mime_type="application/json" for structured tasks)
             └─ else → deterministic extractive demo generator
        → response carries mode + cited segment timestamps (or "no support found")
```

- Structured tasks (notes, quiz, scene plan) use JSON-schema constrained output.
- Every answer includes `references[]` (segment ids + timestamps). Demo mode returns the
  actually-matching segments; nothing is invented.

## 7. Video generation pipeline

```
POST /lectures/{id}/explainervideos → job row (queued)
async worker:
  1. ai.concept_script(concept, complexity, transcript)   → script JSON (scenes[])
  2. manim_templates.build_scene_plan(script)             → validated scene plan
  3. manim_templates.render_script(plan)                  → .py source (templates only)
  4. if manim+ffmpeg present: manim -qh → mp4, gTTS/Gemini TTS → audio, ffmpeg mux
     else: status="render_skipped", scene plan + script + narration still saved & viewable
  5. progress 0→100 persisted; frontend polls GET /video-jobs/{id}
```

## 8. Frontend architecture

- `src/lib/api.js` — single fetch wrapper: base URL from `VITE_API_URL`, bearer token from
  localStorage, typed-ish helpers, error normalization, abort support.
- `src/context/AuthContext.jsx` — session bootstrap, login/signup/logout, profile.
- `src/components/ui/*` — design-system primitives (Button, Chip, Card, Input, Spinner,
  EmptyState, ErrorState, Modal, Toast, ProgressBar) built from `MASTER.md` tokens.
- Pages: `Landing, Onboarding, Login, Signup, Dashboard, NewLecture, LectureWorkspace,
  Library, Analytics` under React Router.
- Workspace = 3-column responsive layout: video + transcript (left), tabbed
  Tutor / Notes / Quiz / Explainer (right); collapses to stacked tabs on ≤1024px.
- All async surfaces implement loading / error / empty states; poll only job endpoints.

## 9. Configuration

Backend `.env` (see `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`,
`GEMINI_API_KEY`, `GEMINI_MODEL`, `CORS_ORIGINS`, `STORAGE_DIR`.
Frontend `.env`: `VITE_API_URL` only — **no AI keys in the browser**.

## 10. Deployment

- Frontend → Vercel (`npm run build`, `dist/`, `VITE_API_URL` env).
- Backend → Render (Python web service, `uvicorn app.main:app`, disk or Supabase Storage
  for generated MP4s) + optional worker process for renders.
- DB → Supabase Postgres (`DATABASE_URL` with `sslmode=require`). pgvector is documented
  for production-grade retrieval; local dev uses in-process TF-IDF so no extension needed.

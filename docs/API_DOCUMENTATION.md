# ORAYA — API Documentation

Base URL: `http://localhost:8000/api/v1` (production: your Render URL).
All request/response bodies are JSON unless noted. Auth = `Authorization: Bearer <jwt>`.

**Response envelope:** success → resource object or `{items: [...]}`; error →
`{"detail": "..."}` (FastAPI standard, HTTP 4xx/5xx).

`mode` fields: `"gemini"` when a live Gemini key performed the work, `"demo"` for the
offline extractive fallback. Never fabricated content in either mode.

---

## Auth

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/auth/signup` | `{email, password, name}` | `{access_token, token_type:"bearer", user}` |
| POST | `/auth/login` | `{email, password}` | `{access_token, token_type:"bearer", user}` |
| GET | `/auth/me` | — | `user` |
| PATCH | `/auth/profile` | `{name?, grade?, language?, subjects?[]}` | `user` |

`user` = `{id, email, name, grade, language, subjects[], created_at}`

Errors: 409 email exists · 401 bad credentials · 422 validation.

## Lectures

| Method | Path | Body / notes | Returns |
|--------|------|--------------|---------|
| POST | `/lectures` | `{url, title?}` — validates YouTube ID, fetches oEmbed metadata, attempts transcript fetch | `lecture` |
| GET | `/lectures` | newest first | `{items:[lecture]}` |
| GET | `/lectures/{id}` | includes `chapters`, `bookmark_count`, `topic_count` | `lecture` |
| DELETE | `/lectures/{id}` | | 204 |
| GET | `/lectures/{id}/transcript` | | `{lecture_id, source, segments:[{id, idx, start, end, text}], chapters:[{id, idx, title, start}]}` |
| POST | `/lectures/{id}/transcript` | `multipart/form-data file` (`.srt`, `.vtt`, `.txt`) | same as above |
| POST | `/lectures/{id}/transcript/search` | `{q}` | `{items:[{segment_id, start, end, text, score}]}` |
| GET | `/lectures/{id}/topics` | | `{items:[{id, name, mastery}]}` |
| GET | `/lectures/{id}/bookmarks` | | `{items:[{id, ts, label}]}` |
| POST | `/lectures/{id}/bookmarks` | `{ts, label}` | `bookmark` |
| DELETE | `/lectures/bookmarks/{id}` | | 204 |

`lecture` = `{id, video_id, url, title, channel, thumbnail, duration, source, transcript_status, created_at}`
`transcript_status` ∈ `ready | missing | uploading` · `source` ∈ `fetched | upload | sample`

## Tutor

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/lectures/{id}/tutor/ask` | `{question, history?:[{role,content}]}` | `{answer, mode, references:[{segment_id, start, end, quote}]}` |
| GET | `/lectures/{id}/tutor/suggestions` | | `{items:[string]}` |

409 if lecture has no transcript. 503-style `{detail, mode:"demo"}` never — degrades to demo instead.

## Notes

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/lectures/{id}/notes/generate` | `{kind: "summary"\|"chapters"\|"definitions"}` | `note` |
| GET | `/lectures/{id}/notes` | | `{items:[note]}` |
| GET | `/notes/{id}` | | `note` |
| PATCH | `/notes/{id}` | `{title?, content_md?}` | `note` |
| DELETE | `/notes/{id}` | | 204 |
| GET | `/notes/{id}/export?format=md\|pdf` | | file download (`text/markdown` or `application/pdf`) |

`note` = `{id, lecture_id, kind, title, content_md, mode, created_at}`

## Quiz

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/lectures/{id}/quiz/generate` | `{count=5, difficulty:"easy"\|"medium"\|"hard"\|"mixed", topics?:[]}` | `quiz` |
| GET | `/quizzes/{id}` | questions **without** `answer` for taking | `quiz` |
| POST | `/quizzes/{id}/attempts` | `{answers:[{question_id, answer}]}` | `{attempt_id, score, results:[{question_id, correct, correct_answer, explanation, topic}], gaps:[topic]}` |
| GET | `/quiz-history` | | `{items:[{id, lecture_title, score, count, created_at}]}` |

`quiz question` = `{id, idx, type:"mcq"\|"short", prompt, options?, topic, difficulty}`

## Learning progress & flashcards

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/progress/overview` | | `{mastery:[{topic, score, lecture_count}], weak_topics:[...], recommendations:[{type, label, href}], streak_days, totals:{...}}` |
| POST | `/lectures/{id}/flashcards/generate` | `{count=8}` | `{items:[flashcard]}` |
| GET | `/flashcards?due=true` | | `{items:[...]}` |
| POST | `/flashcards/{id}/review` | `{quality: 0..3}` | `flashcard` (updated interval/due_at) |

## Explainer video jobs

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/lectures/{id}/explainer-videos` | `{concept, complexity:"beginner"\|"intermediate"\|"advanced"}` | `video_job` |
| GET | `/video-jobs` | | `{items:[video_job]}` |
| GET | `/video-jobs/{id}` | polled by frontend | `video_job` |
| GET | `/video-jobs/{id}/download?kind=mp4\|py\|script` | file download | file |

`video_job` = `{id, lecture_id, concept, complexity, status, progress, stage, scene_plan?, script?, video_url?, narration?, renderer:{manim:bool, ffmpeg:bool}, error?, created_at}`
`status` ∈ `queued | generating_script | building_scenes | rendering | muxing | completed | render_skipped | failed`

## Dashboard

| Method | Path | Returns |
|--------|------|---------|
| GET | `/dashboard` | `{stats:{lectures, notes, quizzes, videos, avg_score, minutes_watched}, recent_lectures:[lecture], recent_attempts:[...], activity:[{date, items}], mode}` |

## Health

| GET | `/health` | `{status:"ok", database, gemini:"live"\|"demo", renderer:{manim, ffmpeg}}` |

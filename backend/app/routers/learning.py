from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Flashcard,
    Lecture,
    QuizAttempt,
    Topic,
    TopicMastery,
    TranscriptSegment,
    User,
    VideoJob,
    WatchProgress,
)
from ..schemas import (
    FlashcardOut,
    FlashcardReview,
    Items,
    ProgressOverview,
    Recommendation,
)
from ..services import demo_ai
from ..services.ai import ai
from ..services.transcript import ParsedSegment

router = APIRouter(prefix="/lectures", tags=["progress"])


class ProgressIn(BaseModel):
    seconds: float = Field(ge=0, le=86_400)


class ProgressOut(BaseModel):
    lecture_id: int
    seconds: float


class FlashcardGenerate(BaseModel):
    count: int = Field(default=8, ge=3, le=20)


# ---------------------------------------------------------------- watch progress
@router.post("/{lecture_id}/progress", response_model=ProgressOut)
def save_progress(
    lecture_id: int,
    payload: ProgressIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressOut:
    from ..services.lecture_service import get_owned_lecture

    lecture = get_owned_lecture(db, user, lecture_id)
    row = db.scalar(
        select(WatchProgress).where(
            WatchProgress.user_id == user.id, WatchProgress.lecture_id == lecture.id
        )
    )
    if row is None:
        row = WatchProgress(user_id=user.id, lecture_id=lecture.id, seconds=payload.seconds)
    else:
        # keep the furthest position, but allow small rewinds to stick
        row.seconds = max(row.seconds, payload.seconds)
    db.add(row)
    db.commit()
    return ProgressOut(lecture_id=lecture.id, seconds=row.seconds)


@router.get("/{lecture_id}/progress", response_model=ProgressOut)
def get_progress(
    lecture_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressOut:
    row = db.scalar(
        select(WatchProgress).where(
            WatchProgress.user_id == user.id, WatchProgress.lecture_id == lecture_id
        )
    )
    return ProgressOut(lecture_id=lecture_id, seconds=row.seconds if row else 0.0)


# ---------------------------------------------------------------- overview
overview_router = APIRouter(tags=["progress"])


@overview_router.get("/progress/overview", response_model=ProgressOverview)
def progress_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressOverview:
    rows = db.execute(
        select(TopicMastery, Topic)
        .join(Topic, Topic.id == TopicMastery.topic_id)
        .where(TopicMastery.user_id == user.id)
    ).all()

    by_name: dict[str, list[tuple[float, int]]] = {}
    for mastery, topic in rows:
        by_name.setdefault(topic.name, []).append((mastery.score, topic.lecture_id))

    mastery_items = []
    for name, vals in by_name.items():
        scores = [v[0] for v in vals]
        mastery_items.append(
            {
                "topic": name,
                "score": round(sum(scores) / len(scores), 3),
                "lecture_count": len({v[1] for v in vals}),
            }
        )
    mastery_items.sort(key=lambda x: -x["score"])

    weak = [m["topic"] for m in mastery_items if m["score"] < 0.6][:6]

    recommendations: list[Recommendation] = []
    for topic_name in weak[:3]:
        topic = db.scalar(select(Topic).where(Topic.name == topic_name).limit(1))
        if topic:
            recommendations.append(
                Recommendation(
                    type="revise",
                    label=f'Revise "{topic_name}" — you scored below 60%',
                    href=f"/lecture/{topic.lecture_id}",
                )
            )

    due_cards = db.scalar(
        select(func.count()).select_from(Flashcard).where(
            Flashcard.user_id == user.id, Flashcard.due_at <= datetime.now(timezone.utc)
        )
    )
    if due_cards:
        recommendations.append(
            Recommendation(type="flashcards", label=f"{due_cards} flashcards due for review", href="/flashcards")
        )

    next_lecture = db.scalar(
        select(Lecture)
        .join(WatchProgress, WatchProgress.lecture_id == Lecture.id)
        .where(WatchProgress.user_id == user.id, WatchProgress.seconds > 15)
        .order_by(WatchProgress.updated_at.desc())
        .limit(1)
    )
    if next_lecture:
        recommendations.append(
            Recommendation(
                type="continue",
                label=f'Continue watching "{next_lecture.title}"',
                href=f"/lecture/{next_lecture.id}",
            )
        )
    if not recommendations:
        recommendations.append(
            Recommendation(type="new", label="Add a YouTube lecture to get started", href="/learn/new")
        )

    # streak: consecutive days with any recorded activity
    activity_days: set[str] = set()
    for table, col in ((QuizAttempt, QuizAttempt.created_at), (WatchProgress, WatchProgress.updated_at)):
        dates = db.scalars(select(func.date(col)).where(table.user_id == user.id)).all()
        activity_days.update(str(d) for d in dates if d)
    streak = 0
    day = datetime.now(timezone.utc).date()
    if activity_days and str(day) not in activity_days:
        day -= timedelta(days=1)
    while str(day) in activity_days:
        streak += 1
        day -= timedelta(days=1)

    lectures_count = db.scalar(select(func.count()).select_from(Lecture).where(Lecture.user_id == user.id)) or 0
    from ..models import Note

    notes_count = db.scalar(
        select(func.count())
        .select_from(Note)
        .join(Lecture, Lecture.id == Note.lecture_id)
        .where(Lecture.user_id == user.id)
    ) or 0
    attempts = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id)).all()
    avg_score = round(sum(a.score for a in attempts) / len(attempts), 3) if attempts else 0.0
    seconds = db.scalar(
        select(func.coalesce(func.sum(WatchProgress.seconds), 0)).where(WatchProgress.user_id == user.id)
    ) or 0
    videos_done = db.scalar(
        select(func.count())
        .select_from(VideoJob)
        .where(VideoJob.user_id == user.id, VideoJob.status.in_(["completed", "render_skipped"]))
    ) or 0

    return ProgressOverview(
        mastery=[
            {"topic": m["topic"], "score": m["score"], "lecture_count": m["lecture_count"]}
            for m in mastery_items[:10]
        ],
        weak_topics=weak,
        recommendations=recommendations,
        streak_days=streak,
        totals={
            "lectures": lectures_count,
            "notes": notes_count,
            "quizzes": len(attempts),
            "videos": videos_done,
            "avg_score": avg_score,
            "minutes_watched": int(seconds // 60),
        },
        mode=ai.mode,
    )


# ---------------------------------------------------------------- flashcards
def _cards_from_lecture(db: Session, user: User, lecture: Lecture, count: int) -> list[Flashcard]:
    segs = sorted(lecture.segments, key=lambda x: x.idx)
    parsed = [ParsedSegment(s.start, s.end, s.text) for s in segs]
    phrases = demo_ai.keyphrases(parsed, limit=count + 4)
    chapters = [(c.title, c.start) for c in sorted(lecture.chapters, key=lambda x: x.idx)]

    cards: list[Flashcard] = []
    used: set[str] = set()
    for phrase, _ in phrases:
        if len(cards) >= count:
            break
        key = phrase.lower()
        if key in used:
            continue
        used.add(key)
        sentence = ""
        ts = 0.0
        for seg in segs:
            if phrase.lower() in seg.text.lower():
                sentence, ts = seg.text, seg.start
                break
        if not sentence:
            continue
        cards.append(
            Flashcard(
                user_id=user.id,
                lecture_id=lecture.id,
                topic=demo_ai._topic_for(chapters, ts),
                front=f"What is {phrase}?",
                back=sentence[:500],
            )
        )
    return cards


@router.post("/{lecture_id}/flashcards/generate", response_model=Items, status_code=status.HTTP_201_CREATED)
def generate_flashcards(
    lecture_id: int,
    payload: FlashcardGenerate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Items:
    from ..services.lecture_service import get_owned_lecture

    lecture = get_owned_lecture(db, user, lecture_id)
    if not lecture.segments:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lecture has no transcript yet")
    cards = _cards_from_lecture(db, user, lecture, payload.count)
    if not cards:
        raise HTTPException(status.HTTP_409_CONFLICT, "Couldn't build cards from this transcript")
    existing = db.scalars(select(Flashcard).where(Flashcard.user_id == user.id, Flashcard.lecture_id == lecture.id)).all()
    by_content = {(c.front.casefold().strip(), c.back.casefold().strip()): c for c in existing}
    saved = []
    for card in cards:
        key = (card.front.casefold().strip(), card.back.casefold().strip())
        if key not in by_content:
            db.add(card)
            by_content[key] = card
        saved.append(by_content[key])
    db.commit()
    return Items(items=[FlashcardOut.model_validate(c) for c in saved])


cards_router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@cards_router.get("/stats")
def flashcard_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    owned = Flashcard.user_id == user.id
    total = db.scalar(select(func.count()).select_from(Flashcard).where(owned)) or 0
    due = db.scalar(select(func.count()).select_from(Flashcard).where(owned, Flashcard.due_at <= now)) or 0
    next_due = db.scalar(select(func.min(Flashcard.due_at)).where(owned, Flashcard.due_at > now))
    return {"total": total, "due": due, "next_due_at": next_due.replace(tzinfo=timezone.utc).isoformat() if next_due else None}


@cards_router.get("", response_model=Items)
def list_flashcards(
    due: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Items:
    stmt = select(Flashcard).where(Flashcard.user_id == user.id)
    if due:
        stmt = stmt.where(Flashcard.due_at <= datetime.now(timezone.utc))
    rows = db.scalars(stmt.order_by(Flashcard.due_at.asc()).limit(100)).all()
    return Items(items=[FlashcardOut.model_validate(c) for c in rows])


@cards_router.post("/{card_id}/review", response_model=FlashcardOut)
def review_flashcard(
    card_id: int,
    payload: FlashcardReview,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FlashcardOut:
    card = db.get(Flashcard, card_id)
    if card is None or card.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flashcard not found")

    quality = payload.quality
    if quality < 2:
        card.reps = 0
        card.interval_days = 0.0
        card.ease = max(1.3, card.ease - 0.2)
        card.due_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    else:
        card.reps += 1
        card.ease = min(3.0, card.ease + (0.1 if quality == 3 else 0.0))
        card.interval_days = 1.0 if card.reps == 1 else card.interval_days * card.ease
        card.interval_days = min(card.interval_days, 180.0)
        card.due_at = datetime.now(timezone.utc) + timedelta(days=card.interval_days)
    db.add(card)
    db.commit()
    db.refresh(card)
    return FlashcardOut.model_validate(card)

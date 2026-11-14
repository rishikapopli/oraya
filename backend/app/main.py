from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import SessionLocal, init_db
from .routers import auth, dashboard, learning, lectures, notes, quiz, tutor, videos
from .routers import ai_preview
from .seed import seed_demo_data
from .services.manim_templates import renderer_status

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def _startup() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    _startup()
    yield


app = FastAPI(
    title="ORAYA API",
    version="1.0.0",
    description="AI-powered personalized interactive learning platform.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    ai_preview.router,
    auth.router,
    lectures.router,
    tutor.router,
    notes.router,
    quiz.router,
    learning.router,
    learning.overview_router,
    learning.cards_router,
    videos.router,
    dashboard.router,
):
    app.include_router(router, prefix="/api/v1")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    logging.getLogger("oraya").exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server"})


@app.get("/api/v1/health")
@app.get("/health")  # alias for uptime probes (Render, load balancers, dev tooling)
def health() -> dict:
    from .services.ai import ai

    try:
        init_db()
        db_ok = True
    except Exception:  # pragma: no cover
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "gemini": {"available": "live", "unavailable": "unavailable", "not_checked": "configured", "unconfigured": "demo"}[ai.status["state"]],
        "ai_status": ai.status,
        "model": settings.gemini_model if ai.mode == "gemini" else None,
        "renderer": renderer_status(),
    }


@app.get("/api/v1/meta")
def meta() -> dict:
    """Frontend boot config (no secrets)."""
    from .services.ai import ai

    return {
        "app": "ORAYA",
        "ai_mode": ai.mode,
        "renderer": renderer_status(),
        "demo_account": {"email": "demo@oraya.app", "password": "oraya-demo-1"},
    }

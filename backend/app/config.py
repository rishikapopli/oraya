from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ORAYA"
    database_url: str = "sqlite:///./oraya.db"
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_expires_days: int = 30
    jwt_algorithm: str = "HS256"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_tutor_model: str = "gemini-3.1-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"

    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    storage_dir: str = "./storage"
    ffmpeg_bin_path: str = ""
    ffprobe_bin_path: str = ""

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

os.makedirs(settings.storage_dir, exist_ok=True)

# Make the configured ffmpeg/ffprobe discoverable by shutil.which(), pydub and
# subprocess calls regardless of how the process was launched (the inherited PATH
# may predate the installer, and .env may name either the binary or its folder).
def _dir_for(value: str) -> str | None:
    """Resolve a configured path to the directory that must be on PATH.

    Accepts the executable itself (…/ffmpeg.exe) or the directory containing it
    (…/ffmpeg). Returns None for values that resolve to nothing on disk.
    """
    if not value:
        return None
    path = Path(value)
    if path.is_dir():
        return str(path)
    if path.is_file():
        return str(path.parent)
    if path.suffix == "" and path.with_suffix(".exe").is_file():
        return str(path.parent)
    return None


for _bin in (settings.ffmpeg_bin_path.strip(), settings.ffprobe_bin_path.strip()):
    _dir = _dir_for(_bin)
    if _dir and _dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = _dir + os.pathsep + os.environ.get("PATH", "")

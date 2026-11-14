"""Single gateway to Google Gemini (google-genai SDK).

Rules enforced here:
  * the API key never leaves the server
  * every call degrades to a caller-supplied deterministic fallback instead of failing
  * callers always learn which mode produced the result: "gemini" | "demo"
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable

from ..config import settings

logger = logging.getLogger("oraya.ai")

_client = None
_client_failed = False


class AIError(RuntimeError):
    pass


def _get_client():
    global _client, _client_failed
    if not settings.gemini_enabled:
        return None
    if _client is not None:
        return _client
    if _client_failed:
        return None
    try:
        from google import genai  # type: ignore

        from google.genai import types
        _client = genai.Client(
            api_key=settings.gemini_api_key.strip(),
            http_options=types.HttpOptions(timeout=60000, retry_options=types.HttpRetryOptions(attempts=2)),
        )
        return _client
    except Exception as exc:  # pragma: no cover - import/config errors
        _client_failed = True
        logger.warning("Gemini client init failed: %s", exc)
        return None


def _generate(prompt: str, system: str | None, json_schema: dict | None, temperature: float, timeout_ms: int | None = None, model: str | None = None, max_output_tokens: int | None = None) -> str:
    from google.genai import types  # type: ignore

    client = _get_client()
    if client is None:
        raise AIError("Gemini is not configured")

    model_name = model or settings.gemini_model
    config: dict[str, Any] = {"temperature": temperature, "max_output_tokens": max_output_tokens or 8192}
    if timeout_ms is not None:
        config["http_options"] = types.HttpOptions(timeout=timeout_ms, retry_options=types.HttpRetryOptions(attempts=2))
    if model_name.startswith("gemini-3.8-"):
        config["thinking_config"] = types.ThinkingConfig(thinking_level="low")
    if system:
        config["system_instruction"] = system
    if json_schema is not None:
        config["response_mime_type"] = "application/json"
        config["response_json_schema"] = json_schema

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(**config),
    )
    candidates = response.candidates or []
    if candidates and str(candidates[0].finish_reason).split(".")[-1] == "MAX_TOKENS":
        raise AIError("Gemini response was truncated; incomplete output was rejected")
    text = (response.text or "").strip()
    if not text:
        raise AIError("Gemini returned an empty response")
    return text


class AI:
    """Facade used by routers/services."""

    def __init__(self):
        self._last_result = None

    def _record(self, available: bool, model: str | None = None):
        self._last_result = {"state": "available" if available else "unavailable",
                             "model": model or settings.gemini_model,
                             "checked_at": datetime.now(timezone.utc).isoformat()}

    @property
    def status(self) -> dict:
        if not settings.gemini_enabled:
            return {"state": "unconfigured", "model": None, "checked_at": None}
        return self._last_result or {"state": "not_checked", "model": settings.gemini_model, "checked_at": None}

    @property
    def mode(self) -> str:
        return "gemini" if settings.gemini_enabled and _get_client() is not None else "demo"

    @property
    def model(self) -> str:
        return settings.gemini_model

    def complete_text(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.4,
        fallback: Callable[[], str],
        timeout_ms: int | None = None,
        model: str | None = None,
        max_output_tokens: int | None = None,
    ) -> tuple[str, str]:
        if self.mode == "gemini":
            try:
                text = _generate(prompt, system, None, temperature, timeout_ms, model, max_output_tokens)
                self._record(True, model)
                return text, "gemini"
            except Exception as exc:
                logger.warning("Gemini text call failed, using demo fallback: %s", exc)
                self._record(False, model)
        return fallback(), "demo"

    def complete_json(
        self,
        prompt: str,
        schema: dict,
        *,
        system: str | None = None,
        temperature: float = 0.3,
        fallback: Callable[[], dict],
    ) -> tuple[dict, str]:
        if self.mode == "gemini":
            try:
                raw = _generate(prompt, system, schema, temperature)
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise AIError("Expected a JSON object from Gemini")
                self._record(True)
                return data, "gemini"
            except Exception as exc:
                logger.warning("Gemini JSON call failed, using demo fallback: %s", exc)
                self._record(False)
        return fallback(), "demo"

    def embed(self, texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[dict[str, float]]:
        """Dense embeddings as sparse {token: weight} dicts keyed by dimension index.

        Raises when Gemini is unavailable so callers fall back to TF-IDF.
        """
        if self.mode != "gemini":
            raise AIError("Gemini is not configured")
        client = _get_client()
        assert client is not None
        from google.genai import types
        response = client.models.embed_content(
            model=settings.gemini_embedding_model, contents=texts,
            config=types.EmbedContentConfig(task_type=task_type, http_options=types.HttpOptions(
                timeout=8000, retry_options=types.HttpRetryOptions(attempts=1))),
        )
        vectors: list[dict[str, float]] = []
        for item in response.embeddings:
            vectors.append({str(i): float(v) for i, v in enumerate(item.values)})
        return vectors


ai = AI()

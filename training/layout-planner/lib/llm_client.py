"""OpenRouter / Gemini client for content filling."""
from __future__ import annotations

import os
from typing import Literal

try:
    import httpx
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("httpx is required: pip install httpx") from exc

Provider = Literal["openrouter", "gemini"]


def resolve_provider(explicit: str | None = None) -> Provider:
    if explicit in ("openrouter", "gemini"):
        return explicit
    if os.environ.get("OPENROUTER_API_KEY", "").strip():
        return "openrouter"
    if os.environ.get("GEMINI_API_KEY", "").strip():
        return "gemini"
    raise RuntimeError("Set OPENROUTER_API_KEY or GEMINI_API_KEY for content filling")


def default_model(provider: Provider) -> str:
    if provider == "openrouter":
        return os.environ.get("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
    return os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")


def call_llm(
    *,
    system: str,
    user: str,
    provider: Provider | None = None,
    model: str | None = None,
    temperature: float = 0.5,
    timeout: float = 120.0,
) -> str:
    provider = resolve_provider(provider)
    model = model or default_model(provider)

    if provider == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
        }
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": f"{system}\n\n{user}"}]}],
        "generationConfig": {"temperature": temperature},
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]

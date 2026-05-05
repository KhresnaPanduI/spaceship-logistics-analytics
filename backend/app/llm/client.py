"""Thin wrapper around the LLM provider.

Currently configured for OpenRouter (OpenAI-compatible API). Swappable to
direct Anthropic or another provider by changing this file only.
"""
from __future__ import annotations

from openai import OpenAI

from app.config import LLM_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        _client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)
    return _client


def model_name() -> str:
    return LLM_MODEL

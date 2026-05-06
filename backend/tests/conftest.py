"""Pytest configuration.

The smoke tests intentionally exercise the deterministic computation path —
registry validation, query_metric SQL generation, forecast pipeline, and
the dashboard HTTP endpoints. The LLM-routed /api/ask path is excluded so
tests run offline without consuming OpenRouter credits.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow `from app...` imports without requiring an editable install.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

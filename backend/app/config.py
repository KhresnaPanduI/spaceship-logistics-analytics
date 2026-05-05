from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_CSV_PATH = Path(os.getenv("DATA_CSV_PATH", BACKEND_ROOT / "data" / "mock_logistics_data.csv"))

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4.6")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

SAFETY_STOCK_PCT = float(os.getenv("SAFETY_STOCK_PCT", "0.20"))

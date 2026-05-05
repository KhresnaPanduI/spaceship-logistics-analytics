from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ask as ask_api
from app.api import charts as charts_api
from app.api import kpis as kpis_api
from app.config import CORS_ORIGINS
from app.data import get_connection, row_count

app = FastAPI(title="Spaceship Logistics Analytics", version="0.1.0")
app.include_router(kpis_api.router)
app.include_router(charts_api.router)
app.include_router(ask_api.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _warmup() -> None:
    # Force CSV load on cold start so the first user request doesn't pay for it.
    get_connection()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "rows": row_count()}

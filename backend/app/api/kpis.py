"""GET /api/kpis — fixed dashboard KPI tiles.

Calls run_query_metric for each tile so the dashboard and the AI path share
exactly one computation source.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas import QueryMetricInput
from app.tools.query_metric import run_query_metric

router = APIRouter(prefix="/api", tags=["dashboard"])

_KPI_METRICS = (
    "total_orders",
    "delivered_orders",
    "delayed_orders",
    "on_time_rate",
    "avg_delivery_days",
)


def _scalar(metric: str) -> float | int | None:
    res = run_query_metric(QueryMetricInput(metric=metric))
    if not res.rows:
        return None
    return res.rows[0].get(metric)


@router.get("/kpis")
def kpis() -> dict:
    return {m: _scalar(m) for m in _KPI_METRICS}

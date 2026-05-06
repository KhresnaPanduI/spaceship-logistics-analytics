"""GET /api/charts/{name} — fixed dashboard charts.

Each named chart is a thin pre-set on top of run_query_metric. Same code path
the AI uses; the dashboard just hard-codes the inputs.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data import get_connection
from app.schemas import QueryMetricInput
from app.tools.query_metric import run_query_metric

router = APIRouter(prefix="/api/charts", tags=["dashboard"])


@router.get("/volume_over_time")
def volume_over_time() -> dict:
    res = run_query_metric(QueryMetricInput(metric="total_orders", time_grain="month"))
    return res.model_dump()


@router.get("/delivery_status")
def delivery_status() -> dict:
    """Counts of each terminal-ish status. We bypass the breakdown machinery
    and run a small ad-hoc SQL because `status` is intentionally not a chart
    breakdown in the registry — it's a filter field. This is the one
    dashboard-only exception, fine because it isn't reachable via the AI path.
    """
    con = get_connection()
    cur = con.execute(
        "SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC"
    )
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return {
        "rows": rows,
        "viz_spec": {"type": "bar", "x": "status", "y": "orders", "y_unit": "count"},
    }


@router.get("/on_time_rate_trend")
def on_time_rate_trend() -> dict:
    """Monthly on-time rate. Pairs with volume_over_time so the reader can see
    whether delivery quality is improving or deteriorating as volume shifts.
    """
    res = run_query_metric(QueryMetricInput(metric="on_time_rate", time_grain="month"))
    return res.model_dump()


@router.get("/delay_rate_by_region")
def delay_rate_by_region() -> dict:
    """Delay rate broken down by region — geographic complement to the
    by-carrier chart. Computed via the same registry path the AI uses.
    """
    res = run_query_metric(QueryMetricInput(metric="delay_rate", breakdown="region"))
    return res.model_dump()


@router.get("/client_revenue_concentration")
def client_revenue_concentration() -> dict:
    """Top-N clients by revenue with their delay rate alongside.

    Custom SQL because this is a two-metric chart (revenue bars + delay-rate
    line) — the registry intentionally only emits a single metric per query.
    Surfaces concentration risk: which large clients are also experiencing
    delivery problems.
    """
    con = get_connection()
    cur = con.execute(
        """
        SELECT
            client_id,
            ROUND(SUM(order_value_usd), 2) AS revenue_usd,
            SUM(CASE WHEN status IN ('delayed','exception') THEN 1 ELSE 0 END)::DOUBLE
              / NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)
              AS delay_rate,
            COUNT(*) AS orders
        FROM orders
        GROUP BY client_id
        ORDER BY revenue_usd DESC
        LIMIT 10
        """
    )
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return {
        "rows": rows,
        # Custom viz consumed by the dedicated ConcentrationChart component.
        "viz_spec": {
            "type": "bar",
            "x": "client_id",
            "y": "revenue_usd",
            "y_unit": "usd",
        },
    }


@router.get("/carrier_delay_rate")
def carrier_delay_rate() -> dict:
    """Per-carrier rate of (delayed + exception) over completed deliveries.

    Computed inline to keep the dashboard chart unambiguous; this is the
    inverse of on_time_rate broken down by carrier.
    """
    con = get_connection()
    cur = con.execute(
        """
        SELECT
            carrier,
            SUM(CASE WHEN status IN ('delayed','exception') THEN 1 ELSE 0 END)::DOUBLE
              / NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)
              AS delay_rate,
            SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END) AS completed
        FROM orders
        GROUP BY carrier
        HAVING completed > 0
        ORDER BY delay_rate DESC
        """
    )
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return {
        "rows": rows,
        "viz_spec": {"type": "bar", "x": "carrier", "y": "delay_rate", "y_unit": "percent"},
    }

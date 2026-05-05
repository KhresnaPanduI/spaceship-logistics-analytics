"""Metric registry — single source of truth for what the system can compute.

Both the LLM system prompt and the Pydantic tool schemas are derived from
this module, so every supported question maps to deterministic SQL here.
Adding a new metric or breakdown means editing this file only.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# ---------- Metrics ----------

@dataclass(frozen=True)
class Metric:
    name: str
    description: str
    sql_aggregate: str        # the aggregate expression in the SELECT
    output_label: str         # column alias in the result
    unit: str                 # for the UI (count, percent, days, usd)


METRICS: dict[str, Metric] = {
    "total_orders": Metric(
        name="total_orders",
        description="Total number of orders in scope.",
        sql_aggregate="COUNT(*)",
        output_label="total_orders",
        unit="count",
    ),
    "delivered_orders": Metric(
        name="delivered_orders",
        description="Orders with status='delivered' (on-time deliveries).",
        sql_aggregate="SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)",
        output_label="delivered_orders",
        unit="count",
    ),
    "delayed_orders": Metric(
        name="delayed_orders",
        description="Orders with status='delayed' (late but completed).",
        sql_aggregate="SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END)",
        output_label="delayed_orders",
        unit="count",
    ),
    "on_time_rate": Metric(
        name="on_time_rate",
        description=(
            "On-time delivery rate. Numerator: orders with status='delivered'. "
            "Denominator: completed deliveries (delivered + delayed + exception). "
            "in_transit and canceled are excluded — they have no completion outcome."
        ),
        sql_aggregate=(
            "SUM(CASE WHEN status = 'delivered' THEN 1.0 ELSE 0 END) "
            "/ NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)"
        ),
        output_label="on_time_rate",
        unit="percent",
    ),
    "delay_rate": Metric(
        name="delay_rate",
        description=(
            "Delay rate = (delayed + exception) / (delivered + delayed + exception). "
            "The complement of on_time_rate; higher = worse service. Use this for "
            "questions about carriers/regions/etc with the 'highest delay rate'."
        ),
        sql_aggregate=(
            "SUM(CASE WHEN status IN ('delayed','exception') THEN 1.0 ELSE 0 END) "
            "/ NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)"
        ),
        output_label="delay_rate",
        unit="percent",
    ),
    "avg_delivery_days": Metric(
        name="avg_delivery_days",
        description="Mean delivery time in days, over orders that have a delivery_date set.",
        sql_aggregate="AVG(DATE_DIFF('day', order_date, delivery_date))",
        output_label="avg_delivery_days",
        unit="days",
    ),
    "total_revenue_usd": Metric(
        name="total_revenue_usd",
        description="Sum of order_value_usd. Promo discounts are not subtracted (raw order value).",
        sql_aggregate="SUM(order_value_usd)",
        output_label="total_revenue_usd",
        unit="usd",
    ),
}

# ---------- Dimensions (allowed breakdowns and filter fields) ----------

DIMENSIONS: dict[str, str] = {
    "carrier": "Logistics carrier (FedEx, UPS, DHL, USPS, OnTrac, LaserShip, Royal Mail, DPD, GLS).",
    "region": "Region (US-E, US-W, US-C, EU, UK).",
    "product_category": "Product category (CRAYON, STICKER, MARKER, BRUSH, PAINT, PENCIL, PAPER, BOOK).",
    "warehouse": "Origin warehouse (e.g. LON-FC1, EWR-DC1).",
    "client_id": "Client identifier (CL-1001..CL-1030).",
    "destination_city": "Destination city, e.g. 'Leeds, UK'.",
    "status": "Order status (delivered, delayed, exception, in_transit, canceled).",
}

# Subset of dimensions that make sense as a chart breakdown.
# `status` is intentionally excluded — it's used as a filter, not a breakdown,
# because most metrics already encode status-based logic.
BREAKDOWNS: tuple[str, ...] = (
    "carrier",
    "region",
    "product_category",
    "warehouse",
    "client_id",
    "destination_city",
)

# ---------- Time grains ----------

TIME_GRAINS: dict[str, str] = {
    "day": "DATE_TRUNC('day', order_date)",
    "week": "DATE_TRUNC('week', order_date)",
    "month": "DATE_TRUNC('month', order_date)",
    "year": "DATE_TRUNC('year', order_date)",
}

TimeGrain = Literal["day", "week", "month", "year", "none"]

# ---------- Filter operators ----------

FILTER_OPS = ("eq", "in")  # equality or IN-list. Date range is a separate top-level pair.


# ---------- Helpers used by tools/prompt assembly ----------

def metric_names() -> tuple[str, ...]:
    return tuple(METRICS.keys())


def registry_summary_for_prompt() -> str:
    """Compact human-readable summary embedded in the LLM system prompt.

    Kept small intentionally (~1KB). The tool JSON schema enforces validity;
    this summary helps the LLM pick *good* names on the first call.
    """
    lines: list[str] = []
    lines.append("METRICS:")
    for m in METRICS.values():
        lines.append(f"  - {m.name} ({m.unit}): {m.description}")
    lines.append("")
    lines.append("BREAKDOWNS (allowed values for `breakdown`):")
    lines.append(f"  {', '.join(BREAKDOWNS)}")
    lines.append("")
    lines.append("FILTER FIELDS (allowed in `filters[].field`):")
    lines.append(f"  {', '.join(DIMENSIONS.keys())}")
    lines.append("")
    lines.append("TIME GRAINS (for `time_grain`):")
    lines.append("  day, week, month, year, none")
    lines.append("")
    lines.append("DATA WINDOW: 2025-01-01 to 2025-12-30 (one calendar year).")
    lines.append("ORDER STATUSES: delivered, delayed, exception, in_transit, canceled.")
    return "\n".join(lines)

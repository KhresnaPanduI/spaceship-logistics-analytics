"""Assembles the system prompt and the tool schemas presented to the LLM.

Both are derived from the registry so the model and the validator never disagree
about what's supported.
"""
from __future__ import annotations

from app.registry import (
    BREAKDOWNS,
    DIMENSIONS,
    METRICS,
    registry_summary_for_prompt,
)


SYSTEM_PROMPT = f"""You are an analytics assistant for a logistics dataset.

You have exactly two tools available: `query_metric` (for descriptive analytics
questions and KPIs) and `forecast` (for predicting future demand).

Your job: interpret the user's question, pick the right tool, and call it with
correctly structured inputs. The tools handle all computation deterministically.
You never compute answers yourself, never invent data, and never write SQL.

If the question cannot be answered by either tool — for example because it
asks about a metric, dimension, or grain that isn't in the registry below —
do NOT call any tool. Instead reply in plain text starting with the literal
prefix "UNSUPPORTED:" followed by a short explanation of why.

Calendar: today's date is 2026-05-05. The dataset covers 2025-01-01 through
2025-12-30 only — there is no 2026 data. Time-relative phrases like "last
month" should be interpreted relative to the data window's end (2025-12-30),
not today.

Forecasting note: SKU-level forecasting is NOT supported. The data has 355
unique SKUs in 400 rows (most appear once) so SKU-grain forecasts have no
signal. Forecast at product_category grain instead.

REGISTRY:
{registry_summary_for_prompt()}
"""


def query_metric_tool_schema() -> dict:
    """OpenAI-format function tool for query_metric."""
    return {
        "type": "function",
        "function": {
            "name": "query_metric",
            "description": (
                "Compute one metric from the registry, optionally broken down by a "
                "dimension and/or bucketed by a time grain, with optional filters."
            ),
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "metric": {
                        "type": "string",
                        "enum": list(METRICS.keys()),
                        "description": "Name of the metric to compute.",
                    },
                    "breakdown": {
                        "type": ["string", "null"],
                        "enum": [*BREAKDOWNS, None],
                        "description": "Dimension to break the metric down by (one bar per value).",
                    },
                    "time_grain": {
                        "type": "string",
                        "enum": ["day", "week", "month", "year", "none"],
                        "default": "none",
                        "description": "Time bucket size. Use 'none' for a single aggregate.",
                    },
                    "filters": {
                        "type": "array",
                        "description": "List of equality or IN filters.",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "field": {"type": "string", "enum": list(DIMENSIONS.keys())},
                                "op": {"type": "string", "enum": ["eq", "in"]},
                                "value": {
                                    "description": "Scalar for op=eq, list for op=in.",
                                },
                            },
                            "required": ["field", "op", "value"],
                        },
                    },
                    "date_from": {
                        "type": ["string", "null"],
                        "format": "date",
                        "description": "Inclusive lower bound on order_date (YYYY-MM-DD).",
                    },
                    "date_to": {
                        "type": ["string", "null"],
                        "format": "date",
                        "description": "Inclusive upper bound on order_date (YYYY-MM-DD).",
                    },
                    "limit": {"type": "integer", "minimum": 1, "maximum": 1000, "default": 100},
                },
                "required": ["metric"],
            },
        },
    }


def forecast_tool_schema() -> dict:
    return {
        "type": "function",
        "function": {
            "name": "forecast",
            "description": (
                "Forecast monthly order count for a product_category over a 1-6 month "
                "horizon. Returns historical + forecast points, an inventory "
                "recommendation, and a methodology explanation."
            ),
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "grain": {
                        "type": "string",
                        "enum": ["product_category"],
                        "default": "product_category",
                    },
                    "entity": {
                        "type": "string",
                        "description": "Product category to forecast, e.g. CRAYON.",
                    },
                    "horizon_months": {"type": "integer", "minimum": 1, "maximum": 6},
                    "method": {
                        "type": "string",
                        "enum": ["auto", "moving_average", "linear_trend"],
                        "default": "auto",
                    },
                },
                "required": ["entity", "horizon_months"],
            },
        },
    }


def all_tools() -> list[dict]:
    return [query_metric_tool_schema(), forecast_tool_schema()]

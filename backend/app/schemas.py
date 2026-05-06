from __future__ import annotations

from datetime import date
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.registry import BREAKDOWNS, DIMENSIONS, FILTER_OPS, METRICS, TIME_GRAINS


class Filter(BaseModel):
    field: str = Field(..., description="Field name from the allowed dimensions list.")
    op: Literal["eq", "in"]
    value: Any = Field(..., description="Scalar for op=eq, list for op=in.")

    @field_validator("field")
    @classmethod
    def _field_allowed(cls, v: str) -> str:
        if v not in DIMENSIONS:
            raise ValueError(
                f"unknown filter field '{v}'. Allowed: {sorted(DIMENSIONS)}"
            )
        return v

    @model_validator(mode="after")
    def _shape(self) -> "Filter":
        if self.op == "in" and not isinstance(self.value, list):
            raise ValueError("op='in' requires `value` to be a list")
        if self.op == "eq" and isinstance(self.value, list):
            raise ValueError("op='eq' requires `value` to be a scalar")
        return self


class QueryMetricInput(BaseModel):
    metric: str
    breakdown: Optional[str] = None
    time_grain: Literal["day", "week", "month", "year", "none"] = "none"
    filters: list[Filter] = Field(default_factory=list)
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    limit: int = 100

    @field_validator("metric")
    @classmethod
    def _metric_allowed(cls, v: str) -> str:
        if v not in METRICS:
            raise ValueError(f"unknown metric '{v}'. Allowed: {sorted(METRICS)}")
        return v

    @field_validator("breakdown")
    @classmethod
    def _breakdown_allowed(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in BREAKDOWNS:
            raise ValueError(f"unknown breakdown '{v}'. Allowed: {sorted(BREAKDOWNS)}")
        return v

    @field_validator("limit")
    @classmethod
    def _limit_bound(cls, v: int) -> int:
        if v <= 0 or v > 1000:
            raise ValueError("limit must be in 1..1000")
        return v

    @model_validator(mode="after")
    def _date_range_consistent(self) -> "QueryMetricInput":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must be <= date_to")
        return self


class VizSpec(BaseModel):
    type: Literal["line", "bar", "stacked_bar", "number", "table"]
    x: Optional[str] = None
    y: Optional[str] = None
    series: Optional[str] = None
    # Lets the frontend pick the right number formatter (percent / currency / days / count).
    y_unit: Optional[Literal["count", "percent", "days", "usd"]] = None
    # Lets the frontend pick a grain-appropriate x-axis label format. Without
    # this, weekly/daily buckets all render as the same month label because
    # they share a common DATE_TRUNC bucket prefix.
    time_grain: Optional[Literal["day", "week", "month", "year", "none"]] = None


class QueryPlan(BaseModel):
    metric: str
    breakdown: Optional[str]
    time_grain: str
    filters: list[Filter]
    date_from: Optional[date]
    date_to: Optional[date]
    sql: str
    execution_ms: float = 0.0


class QueryResult(BaseModel):
    rows: list[dict]
    plan: QueryPlan
    viz_spec: VizSpec


# ---------- Forecast ----------


class ForecastInput(BaseModel):
    grain: Literal["product_category"] = "product_category"
    entity: str = Field(..., description="The product_category to forecast (e.g. 'CRAYON').")
    horizon_months: int = Field(..., ge=1, le=6)
    method: Literal["auto", "moving_average", "linear_trend"] = "auto"


class ForecastPoint(BaseModel):
    period: str
    value: float


class ForecastPlan(BaseModel):
    grain: str
    entity: str
    horizon_months: int
    method_used: str
    params: dict


class ForecastResult(BaseModel):
    historical: list[ForecastPoint]
    forecast: list[ForecastPoint]
    inventory_recommendation: int
    methodology: str
    plan: ForecastPlan


# ---------- /api/ask response wrapper ----------


class UnsupportedResult(BaseModel):
    kind: Literal["unsupported"] = "unsupported"
    message: str
    supported_metrics: list[str]
    supported_breakdowns: list[str]


class QueryAnswer(BaseModel):
    kind: Literal["query"] = "query"
    answer: str
    result: QueryResult


class ForecastAnswer(BaseModel):
    kind: Literal["forecast"] = "forecast"
    answer: str
    result: ForecastResult

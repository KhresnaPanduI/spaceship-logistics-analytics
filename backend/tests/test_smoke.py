"""Smoke tests — fast, deterministic, no LLM.

Each test pins a numeric or structural truth that we want to be alerted
about if a refactor breaks it. The LLM orchestrator is intentionally not
covered here (covered by manual end-to-end checks against /api/ask).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import ForecastInput, QueryMetricInput
from app.tools.forecast import run_forecast
from app.tools.query_metric import run_query_metric

client = TestClient(app)


# ---------- HTTP smoke ----------


def test_health_endpoint_returns_full_dataset() -> None:
    """The CSV view should expose all 400 rows from the 2025 dataset."""
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["rows"] == 400


def test_kpis_endpoint_matches_dataset_truth() -> None:
    """KPI numbers are pinned: any drift here means the registry SQL changed."""
    r = client.get("/api/kpis")
    assert r.status_code == 200
    k = r.json()
    assert k["total_orders"] == 400
    assert k["delivered_orders"] == 304
    assert k["delayed_orders"] == 55
    assert k["in_transit_orders"] == 27
    # 304 / (304 + 55 + 11) = 0.8216...
    assert k["on_time_rate"] == pytest.approx(0.8216, abs=1e-3)
    # Sum of delayed + exception order_value_usd, rounded.
    assert k["revenue_at_risk_usd"] == pytest.approx(2386.10, abs=0.5)


# ---------- Registry validation ----------


def test_query_metric_rejects_unknown_metric() -> None:
    with pytest.raises(ValidationError, match="unknown metric"):
        QueryMetricInput(metric="not_a_real_metric")


def test_query_metric_rejects_unknown_breakdown() -> None:
    with pytest.raises(ValidationError, match="unknown breakdown"):
        QueryMetricInput(metric="total_orders", breakdown="not_a_dim")


def test_query_metric_rejects_inverted_date_range() -> None:
    with pytest.raises(ValidationError, match="date_from must be <= date_to"):
        QueryMetricInput(
            metric="total_orders",
            date_from="2025-06-01",
            date_to="2025-01-01",
        )


# ---------- query_metric correctness ----------


def test_volume_by_month_returns_twelve_rows() -> None:
    """2025 has 12 calendar months; every month has at least one order."""
    res = run_query_metric(QueryMetricInput(metric="total_orders", time_grain="month"))
    assert len(res.rows) == 12
    assert sum(int(r["total_orders"]) for r in res.rows) == 400
    assert res.viz_spec.type == "line"
    assert res.viz_spec.y_unit == "count"


def test_delay_rate_by_carrier_is_in_unit_interval() -> None:
    """Every carrier's delay_rate must be a probability in [0, 1]."""
    res = run_query_metric(QueryMetricInput(metric="delay_rate", breakdown="carrier"))
    assert res.rows, "expected at least one carrier row"
    for row in res.rows:
        rate = row["delay_rate"]
        assert rate is None or 0.0 <= float(rate) <= 1.0
    assert res.viz_spec.y_unit == "percent"


# ---------- Forecast pipeline ----------


def test_forecast_crayon_returns_well_formed_result() -> None:
    """Forecast for a known category produces all four downstream artifacts."""
    res = run_forecast(ForecastInput(entity="CRAYON", horizon_months=4))
    assert len(res.historical) == 12  # 12 months of 2025 history
    assert len(res.forecast) == 4
    assert res.inventory_recommendation >= 1
    assert "CRAYON" in res.methodology
    assert res.plan.method_used in {"linear_trend", "moving_average"}


def test_forecast_rejects_unknown_entity() -> None:
    """SKU-level forecasting is intentionally unsupported; the rejection
    must mention SKU so the error is actionable for the user."""
    with pytest.raises(ValueError, match="SKU"):
        run_forecast(ForecastInput(entity="NOT_A_CATEGORY", horizon_months=3))

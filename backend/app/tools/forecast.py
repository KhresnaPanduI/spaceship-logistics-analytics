"""forecast tool — category-grain monthly demand forecast.

Pipeline: build a complete monthly series for the requested category over the
data window, then fit one of two non-seasonal methods (auto-selected by
length), then project forward `horizon_months` months. Returns historical +
forecast points, a 20%-buffer inventory recommendation, and a methodology
string suitable for end-user display.

Why no seasonal models: the dataset covers a single calendar year (12 months).
Holt-Winters / SARIMA need at least two full cycles to detect seasonality;
fitting them here would overfit to noise.
"""
from __future__ import annotations

import math
from datetime import date

import numpy as np
import pandas as pd

from app.config import SAFETY_STOCK_PCT
from app.data import get_connection
from app.schemas import (
    ForecastInput,
    ForecastPlan,
    ForecastPoint,
    ForecastResult,
)

DATA_START = date(2025, 1, 1)
DATA_END = date(2025, 12, 31)


def _list_categories() -> list[str]:
    con = get_connection()
    return [r[0] for r in con.execute(
        "SELECT DISTINCT product_category FROM orders ORDER BY 1"
    ).fetchall()]


def _load_monthly_series(category: str) -> pd.Series:
    con = get_connection()
    cur = con.execute(
        """
        SELECT DATE_TRUNC('month', order_date) AS month, COUNT(*) AS orders
        FROM orders
        WHERE product_category = ?
        GROUP BY 1
        ORDER BY 1
        """,
        [category],
    )
    rows = cur.fetchall()
    s = pd.Series(
        {pd.Timestamp(r[0]): int(r[1]) for r in rows}, dtype="float64", name="orders"
    )
    # Reindex onto a complete monthly grid spanning the data window so missing
    # months become 0 (real demand information, not silent gaps).
    full_index = pd.date_range(DATA_START, DATA_END, freq="MS")
    return s.reindex(full_index, fill_value=0.0)


def _next_months(after: pd.Timestamp, n: int) -> pd.DatetimeIndex:
    return pd.date_range(after + pd.offsets.MonthBegin(1), periods=n, freq="MS")


def _fit_linear(history: pd.Series, horizon: int) -> tuple[np.ndarray, dict]:
    x = np.arange(len(history), dtype=float)
    y = history.to_numpy(dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    fitted = slope * x + intercept
    ss_res = float(np.sum((y - fitted) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    future_x = np.arange(len(history), len(history) + horizon, dtype=float)
    forecast = slope * future_x + intercept
    forecast = np.clip(forecast, 0.0, None)
    return forecast, {
        "slope": float(round(slope, 4)),
        "intercept": float(round(intercept, 4)),
        "r2": float(round(r2, 4)),
        "history_length_months": int(len(history)),
    }


def _fit_moving_average(history: pd.Series, horizon: int, window: int = 3) -> tuple[np.ndarray, dict]:
    last = history.tail(window)
    avg = float(last.mean()) if len(last) else 0.0
    return np.full(horizon, max(avg, 0.0)), {
        "window_months": window,
        "avg_of_last_window": round(avg, 4),
        "history_length_months": int(len(history)),
    }


def _select_method(history: pd.Series) -> str:
    nonzero = int((history > 0).sum())
    return "linear_trend" if nonzero >= 6 else "moving_average"


def run_forecast(inp: ForecastInput) -> ForecastResult:
    categories = _list_categories()
    if inp.entity not in categories:
        # We treat this as a validated rejection by raising; the API layer
        # will turn it into a structured "unsupported entity" message.
        raise ValueError(
            f"unknown product_category '{inp.entity}'. "
            f"Allowed: {categories}. SKU-level forecasting is not supported "
            f"because most SKUs appear only once or twice in the data."
        )

    history = _load_monthly_series(inp.entity)

    method_used = _select_method(history) if inp.method == "auto" else inp.method
    if method_used == "linear_trend":
        forecast_arr, params = _fit_linear(history, inp.horizon_months)
        method_label = "linear trend (least squares)"
    else:
        forecast_arr, params = _fit_moving_average(history, inp.horizon_months)
        method_label = f"moving average (window={params['window_months']})"

    forecast_index = _next_months(history.index[-1], inp.horizon_months)

    historical_points = [
        ForecastPoint(period=ts.date().isoformat(), value=float(v))
        for ts, v in history.items()
    ]
    forecast_points = [
        ForecastPoint(period=ts.date().isoformat(), value=float(round(v, 2)))
        for ts, v in zip(forecast_index, forecast_arr)
    ]

    forecast_total = float(np.sum(forecast_arr))
    inventory_recommendation = max(1, math.ceil(forecast_total * (1.0 + SAFETY_STOCK_PCT)))

    methodology = _methodology_string(
        category=inp.entity,
        method_label=method_label,
        params=params,
        horizon=inp.horizon_months,
        forecast_total=forecast_total,
        safety_pct=SAFETY_STOCK_PCT,
        recommendation=inventory_recommendation,
    )

    plan = ForecastPlan(
        grain=inp.grain,
        entity=inp.entity,
        horizon_months=inp.horizon_months,
        method_used=method_used,
        params=params,
    )

    return ForecastResult(
        historical=historical_points,
        forecast=forecast_points,
        inventory_recommendation=inventory_recommendation,
        methodology=methodology,
        plan=plan,
    )


def _methodology_string(
    *,
    category: str,
    method_label: str,
    params: dict,
    horizon: int,
    forecast_total: float,
    safety_pct: float,
    recommendation: int,
) -> str:
    parts: list[str] = [
        f"Forecast for product_category='{category}' over {horizon} month(s) using {method_label}.",
        f"Fit on {params['history_length_months']} months of historical order counts.",
    ]
    if "r2" in params:
        parts.append(f"Linear-trend R²={params['r2']:.2f} (slope={params['slope']:+.2f} orders/month).")
    if "avg_of_last_window" in params:
        parts.append(f"Average of last {params['window_months']} months = {params['avg_of_last_window']:.2f}.")
    parts.append(
        f"Inventory recommendation = ceil(sum_forecast × (1 + safety_stock)) = "
        f"ceil({forecast_total:.2f} × {1 + safety_pct:.2f}) = {recommendation} units."
    )
    parts.append(
        "Limitations: 12-month history is too short to detect seasonality; no confidence intervals; "
        "SKU-level forecasting unavailable due to data sparsity (355 unique SKUs in 400 rows)."
    )
    return " ".join(parts)

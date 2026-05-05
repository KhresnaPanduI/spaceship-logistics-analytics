"""query_metric tool — translates a validated QueryMetricInput into SQL and runs it.

The shape of the SQL is fixed:

    SELECT [time_bucket], [breakdown], <metric_aggregate> AS <metric>
    FROM orders
    [WHERE filters]
    [GROUP BY time_bucket, breakdown]
    [ORDER BY time_bucket, breakdown]
    LIMIT N

All identifiers come from the registry (already validated by Pydantic), so
parameter binding is only needed for filter values.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from app.data import get_connection
from app.registry import METRICS, TIME_GRAINS
from app.schemas import (
    Filter,
    QueryMetricInput,
    QueryPlan,
    QueryResult,
    VizSpec,
)


def _build_where(
    filters: list[Filter],
    date_from: date | None,
    date_to: date | None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    for f in filters:
        if f.op == "eq":
            clauses.append(f"{f.field} = ?")
            params.append(f.value)
        else:  # 'in'
            placeholders = ",".join(["?"] * len(f.value))
            clauses.append(f"{f.field} IN ({placeholders})")
            params.extend(f.value)
    if date_from is not None:
        clauses.append("order_date >= ?")
        params.append(date_from)
    if date_to is not None:
        clauses.append("order_date <= ?")
        params.append(date_to)
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where_sql, params


def _build_sql(inp: QueryMetricInput) -> tuple[str, list[Any]]:
    metric = METRICS[inp.metric]
    select_parts: list[str] = []
    group_parts: list[str] = []
    order_parts: list[str] = []

    time_alias = "period"
    if inp.time_grain != "none":
        time_expr = TIME_GRAINS[inp.time_grain]
        select_parts.append(f"{time_expr} AS {time_alias}")
        group_parts.append(time_expr)
        order_parts.append(time_alias)

    if inp.breakdown:
        select_parts.append(inp.breakdown)
        group_parts.append(inp.breakdown)
        order_parts.append(inp.breakdown)

    select_parts.append(f"{metric.sql_aggregate} AS {metric.output_label}")

    where_sql, params = _build_where(inp.filters, inp.date_from, inp.date_to)
    sql = f"SELECT {', '.join(select_parts)} FROM orders {where_sql}".strip()
    if group_parts:
        sql += f" GROUP BY {', '.join(group_parts)}"
    if order_parts:
        sql += f" ORDER BY {', '.join(order_parts)}"
    sql += f" LIMIT {inp.limit}"
    return sql, params


def _infer_viz(inp: QueryMetricInput) -> VizSpec:
    metric = METRICS[inp.metric]
    if inp.time_grain != "none":
        return VizSpec(type="line", x="period", y=metric.output_label, series=inp.breakdown)
    if inp.breakdown:
        return VizSpec(type="bar", x=inp.breakdown, y=metric.output_label)
    return VizSpec(type="number", y=metric.output_label)


def run_query_metric(inp: QueryMetricInput) -> QueryResult:
    sql, params = _build_sql(inp)
    con = get_connection()
    cur = con.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, _coerce_row(row))) for row in cur.fetchall()]

    plan = QueryPlan(
        metric=inp.metric,
        breakdown=inp.breakdown,
        time_grain=inp.time_grain,
        filters=inp.filters,
        date_from=inp.date_from,
        date_to=inp.date_to,
        sql=_inline_sql_for_display(sql, params),
    )
    return QueryResult(rows=rows, plan=plan, viz_spec=_infer_viz(inp))


def _coerce_row(row: tuple) -> tuple:
    """Convert DuckDB date/decimal values into JSON-serialisable forms."""
    out: list[Any] = []
    for v in row:
        if isinstance(v, date):
            out.append(v.isoformat())
        else:
            out.append(v)
    return tuple(out)


def _inline_sql_for_display(sql: str, params: list[Any]) -> str:
    """Substitute ? placeholders with quoted literals for the readable plan view.

    This is for display only — the actual execution above uses parameterised binding.
    """
    out = sql
    for p in params:
        if p is None:
            literal = "NULL"
        elif isinstance(p, (int, float)):
            literal = str(p)
        elif isinstance(p, date):
            literal = f"DATE '{p.isoformat()}'"
        else:
            literal = "'" + str(p).replace("'", "''") + "'"
        out = out.replace("?", literal, 1)
    return out

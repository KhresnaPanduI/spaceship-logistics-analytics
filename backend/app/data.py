from __future__ import annotations

import duckdb

from app.config import DATA_CSV_PATH

# Status sets used across metrics
STATUSES_COMPLETED_DELIVERY = ("delivered", "delayed", "exception")  # have delivery_date
STATUSES_ON_TIME = ("delivered",)
STATUSES_NOT_ON_TIME = ("delayed", "exception")

_con: duckdb.DuckDBPyConnection | None = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return a per-call DuckDB cursor over the shared in-memory database.

    A single underlying DuckDB connection is initialised once per process with the
    orders view loaded over the CSV. Each call returns a fresh ``cursor()`` — these
    are lightweight thread-safe handles that share the catalog/views, which is what
    we need because FastAPI runs sync endpoints in a threadpool and the dashboard
    fires several queries in parallel.
    """
    global _con
    if _con is None:
        _con = duckdb.connect(":memory:")
        _con.execute(
            f"""
            CREATE OR REPLACE VIEW orders AS
            SELECT
                client_id,
                order_id,
                CAST(order_date AS DATE) AS order_date,
                TRY_CAST(delivery_date AS DATE) AS delivery_date,
                carrier,
                origin_city,
                destination_city,
                status,
                sku,
                product_category,
                CAST(quantity AS INTEGER) AS quantity,
                CAST(unit_price_usd AS DOUBLE) AS unit_price_usd,
                CAST(order_value_usd AS DOUBLE) AS order_value_usd,
                CAST(is_promo AS INTEGER) AS is_promo,
                TRY_CAST(promo_discount_pct AS INTEGER) AS promo_discount_pct,
                region,
                warehouse
            FROM read_csv_auto('{DATA_CSV_PATH.as_posix()}', header=true)
            """
        )
    return _con.cursor()


def row_count() -> int:
    return int(get_connection().execute("SELECT COUNT(*) FROM orders").fetchone()[0])

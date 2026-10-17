"""Borderless monthly pipeline.

extract (visa, World Bank, HDI, Natural Earth) -> load raw into DuckDB

Extract tasks only write files, so they run in parallel. Every task that
writes to the DuckDB file uses the single-slot `duckdb_writer` pool.
"""

from __future__ import annotations

import pendulum
from airflow.sdk import dag, task

DUCKDB_POOL = "duckdb_writer"


@dag(
    dag_id="borderless_monthly",
    schedule="@monthly",
    start_date=pendulum.datetime(2026, 1, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 1, "retry_delay": pendulum.duration(minutes=2)},
    tags=["borderless"],
    doc_md=__doc__,
)
def borderless_monthly():
    @task
    def extract_visa() -> str:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.extract.visa import extract_visa

        return str(extract_visa(get_settings()))

    @task
    def extract_worldbank() -> str:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.extract.worldbank import extract_worldbank

        return str(extract_worldbank(get_settings()))

    @task
    def extract_hdi() -> str:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.extract.hdi import extract_hdi

        return str(extract_hdi(get_settings()))

    @task
    def extract_natural_earth() -> str:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.extract.geo import extract_geo

        return str(extract_geo(get_settings()))

    @task(pool=DUCKDB_POOL)
    def load_raw() -> dict:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.load import load_raw

        return load_raw(get_settings())

    [extract_visa(), extract_worldbank(), extract_hdi(), extract_natural_earth()] >> load_raw()


borderless_monthly()

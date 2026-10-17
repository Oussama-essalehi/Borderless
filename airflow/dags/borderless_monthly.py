"""Borderless monthly pipeline.

extract (visa, World Bank, HDI, Natural Earth) -> load raw into DuckDB
-> dbt (one Airflow task per seed, model and test, via Cosmos) -> dbt docs
-> network metrics (networkx) -> export JSON to web/public/data
-> changes since the previous snapshot

Extract tasks only write files, so they run in parallel. Every task that
writes to the DuckDB file uses the single-slot `duckdb_writer` pool.
"""

from __future__ import annotations

import os
from pathlib import Path

import pendulum
from airflow.sdk import dag, task
from cosmos import DbtTaskGroup, ExecutionConfig, ProfileConfig, ProjectConfig, RenderConfig
from cosmos.constants import LoadMode, TestBehavior

DUCKDB_POOL = "duckdb_writer"
DBT_PROJECT_DIR = Path(os.environ.get("DBT_PROJECT_DIR", "/opt/borderless/dbt"))
DBT_EXECUTABLE = os.environ.get("DBT_EXECUTABLE", "/opt/dbt-venv/bin/dbt")


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

    dbt = DbtTaskGroup(
        group_id="dbt",
        project_config=ProjectConfig(dbt_project_path=DBT_PROJECT_DIR),
        profile_config=ProfileConfig(
            profile_name="borderless",
            target_name="dev",
            profiles_yml_filepath=DBT_PROJECT_DIR / "profiles.yml",
        ),
        execution_config=ExecutionConfig(dbt_executable_path=DBT_EXECUTABLE),
        render_config=RenderConfig(load_method=LoadMode.DBT_LS, test_behavior=TestBehavior.AFTER_EACH),
        # Every dbt task writes to (or reads while others write to) the DuckDB file.
        operator_args={"pool": DUCKDB_POOL, "install_deps": False},
    )

    @task(pool=DUCKDB_POOL)
    def dbt_docs() -> None:
        from borderless_pipeline.cli import run_dbt
        from borderless_pipeline.config import get_settings

        run_dbt(get_settings(), "docs", "generate")

    @task(pool=DUCKDB_POOL)
    def network_metrics() -> dict:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.network import run_network

        return run_network(get_settings())

    @task(pool=DUCKDB_POOL)
    def export_json() -> dict:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.export import export_all

        sizes = export_all(get_settings())
        return {"files": len(sizes), "bytes": sum(sizes.values())}

    @task(pool=DUCKDB_POOL)
    def generate_changes() -> dict:
        from borderless_pipeline.config import get_settings
        from borderless_pipeline.export import export_changes

        result = export_changes(get_settings())
        return {k: str(v) for k, v in result.items()}

    extracts = [extract_visa(), extract_worldbank(), extract_hdi(), extract_natural_earth()]
    extracts >> load_raw() >> dbt >> dbt_docs() >> network_metrics() >> export_json() >> generate_changes()


borderless_monthly()

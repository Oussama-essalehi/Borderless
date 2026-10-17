"""Borderless monthly pipeline (milestone 1: environment smoke test)."""

from __future__ import annotations

import os
import subprocess

import pendulum
from airflow.sdk import dag, task


@dag(
    dag_id="borderless_monthly",
    schedule="@monthly",
    start_date=pendulum.datetime(2026, 1, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    tags=["borderless"],
)
def borderless_monthly():
    @task
    def check_environment() -> dict:
        import duckdb
        import networkx

        dbt = subprocess.run(
            [os.environ["DBT_EXECUTABLE"], "--version"],
            capture_output=True,
            text=True,
            check=True,
        )
        return {
            "duckdb": duckdb.__version__,
            "networkx": networkx.__version__,
            "dbt": dbt.stdout.splitlines()[1].strip(),
        }

    check_environment()


borderless_monthly()

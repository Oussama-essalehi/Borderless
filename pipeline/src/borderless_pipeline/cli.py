"""Command-line entry point: `python -m borderless_pipeline <step>`.

`all` runs the same steps as the Airflow DAG, in the same order, without
Airflow: extract -> load -> dbt build -> network -> export -> changes.
"""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import subprocess
import sys

from .config import Settings, get_settings
from .extract.geo import extract_geo
from .extract.hdi import extract_hdi
from .extract.visa import extract_visa
from .extract.worldbank import extract_worldbank
from .load import load_raw

EXTRACTORS = {
    "visa": extract_visa,
    "worldbank": extract_worldbank,
    "hdi": extract_hdi,
    "geo": extract_geo,
}


def run_extract(settings: Settings, which: str, force: bool) -> None:
    names = EXTRACTORS if which == "all" else [which]
    for name in names:
        EXTRACTORS[name](settings, force=force)


def dbt_executable() -> str:
    exe = os.environ.get("DBT_EXECUTABLE") or shutil.which("dbt", path=os.path.dirname(sys.executable)) or "dbt"
    return exe


def run_dbt(settings: Settings, *args: str) -> None:
    project = str(settings.dbt_project_dir)
    env = {**os.environ, "BORDERLESS_DUCKDB_PATH": str(settings.duckdb_path)}
    cmd = [dbt_executable(), *args, "--project-dir", project, "--profiles-dir", project]
    logging.info("running %s", " ".join(cmd))
    subprocess.run(cmd, check=True, env=env)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="borderless")
    sub = parser.add_subparsers(dest="step", required=True)
    p_extract = sub.add_parser("extract", help="download raw sources")
    p_extract.add_argument("source", nargs="?", default="all", choices=["all", *EXTRACTORS])
    p_extract.add_argument("--force", action="store_true", help="ignore the raw cache")
    sub.add_parser("load", help="load raw files into DuckDB")
    p_all = sub.add_parser("all", help="run every step (what `make data` calls)")
    p_all.add_argument("--force", action="store_true", help="ignore the raw cache")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = get_settings()

    if args.step == "extract":
        run_extract(settings, args.source, args.force)
    elif args.step == "load":
        load_raw(settings)
    elif args.step == "all":
        run_extract(settings, "all", args.force)
        load_raw(settings)


if __name__ == "__main__":
    main()

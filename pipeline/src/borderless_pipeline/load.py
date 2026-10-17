"""Load raw files into the DuckDB `raw` schema (full refresh each run).

This is the first task that writes to the warehouse; everything downstream of
it must run one at a time because DuckDB allows a single writer.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import duckdb

from .config import Settings

log = logging.getLogger(__name__)


def _sql_path(path: Path) -> str:
    return str(path).replace("'", "''")


def connect(settings: Settings, read_only: bool = False) -> duckdb.DuckDBPyConnection:
    settings.duckdb_path.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(settings.duckdb_path), read_only=read_only)


def load_raw(settings: Settings) -> dict[str, int]:
    raw = settings.raw_dir
    manifest = json.loads((raw / "_manifest.json").read_text())
    visa_glob = _sql_path(raw / "visa" / "*__*.csv")
    snapshots_csv = _sql_path(raw / "visa" / "snapshots.csv")

    def downloaded_at(source: str) -> str:
        return manifest[source]["downloaded_at"]

    statements = {
        # Older files call the third column "Code", newer ones "Requirement":
        # read positionally with fixed names, everything as text.
        "visa_requirements": f"""
            select
                cast(regexp_extract(filename, '(\\d{{4}}-\\d{{2}}-\\d{{2}})__', 1) as date) as snapshot_date,
                regexp_extract(filename, '__([a-z0-9_]+)\\.csv$', 1)                  as source,
                passport, destination, requirement,
                regexp_extract(filename, '[^/]+$')                                     as _file,
                timestamptz '{downloaded_at("visa")}'                                  as _downloaded_at
            from read_csv('{visa_glob}', header = true, filename = true, auto_detect = false,
                          columns = {{'passport': 'VARCHAR', 'destination': 'VARCHAR', 'requirement': 'VARCHAR'}})
        """,
        "visa_snapshots": f"""
            select *, timestamptz '{downloaded_at("visa")}' as _downloaded_at
            from read_csv('{snapshots_csv}', header = true, all_varchar = true)
        """,
        "worldbank_gdp_per_capita": f"""
            select iso3, year::int as year, value::double as gdp_per_capita_usd,
                   timestamptz '{downloaded_at("worldbank")}' as _downloaded_at
            from read_json('{_sql_path(raw / "worldbank" / "gdp_per_capita.ndjson")}', format = 'newline_delimited')
        """,
        "worldbank_countries": f"""
            select *, timestamptz '{downloaded_at("worldbank")}' as _downloaded_at
            from read_json('{_sql_path(raw / "worldbank" / "countries.ndjson")}', format = 'newline_delimited')
        """,
        "undp_hdi": f"""
            select *, timestamptz '{downloaded_at("undp_hdi")}' as _downloaded_at
            from read_csv('{_sql_path(raw / "undp" / "hdi_composite_time_series.csv")}', header = true, all_varchar = true)
        """,
        "natural_earth_countries": f"""
            select *, timestamptz '{downloaded_at("natural_earth")}' as _downloaded_at
            from read_json('{_sql_path(raw / "natural_earth" / "countries.ndjson")}', format = 'newline_delimited')
        """,
    }

    counts: dict[str, int] = {}
    con = connect(settings)
    try:
        con.execute("create schema if not exists raw")
        con.execute("begin transaction")
        for table, query in statements.items():
            con.execute(f"create or replace table raw.{table} as {query}")
            counts[table] = con.execute(f"select count(*) from raw.{table}").fetchone()[0]
        con.execute(
            "create or replace table raw.source_manifest as "
            "select * from (values " + ", ".join(["(?, ?, ?::timestamptz, ?)"] * len(manifest)) + ") "
            "as t(source, url, downloaded_at, details)",
            [
                value
                for entry in manifest.values()
                for value in (
                    entry["source"],
                    json.dumps(entry["url"]),
                    entry["downloaded_at"],
                    json.dumps({k: v for k, v in entry.items() if k not in {"source", "url", "downloaded_at", "files"}}),
                )
            ],
        )
        con.execute("commit")
    except Exception:
        con.execute("rollback")
        raise
    finally:
        con.close()
    for table, n in counts.items():
        log.info("raw.%s: %s rows", table, n)
    return counts

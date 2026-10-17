"""Paths and source URLs, overridable through environment variables.

Defaults resolve relative to the repository so `make data` works from a fresh
clone; the Airflow containers set the BORDERLESS_* variables explicitly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _path(env: str, default: Path) -> Path:
    value = os.environ.get(env)
    return Path(value) if value else default


@dataclass(frozen=True)
class Sources:
    # Visa requirements. The first repo was archived in January 2025 and points
    # to the second one for data from February 2026 onwards.
    visa_repos: tuple[tuple[str, str], ...] = (
        ("ilyankou", "https://github.com/ilyankou/passport-index-dataset.git"),
        ("imorte", "https://github.com/imorte/passport-index-data.git"),
    )
    worldbank_api: str = "https://api.worldbank.org/v2"
    worldbank_indicator: str = "NY.GDP.PCAP.CD"
    worldbank_years: str = "2015:2025"
    hdi_csv: str = os.environ.get(
        "BORDERLESS_HDI_URL",
        "https://hdr.undp.org/sites/default/files/2025_HDR/"
        "HDR25_Composite_indices_complete_time_series.csv",
    )
    natural_earth_geojson: str = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "v5.1.2/geojson/ne_50m_admin_0_countries.geojson"
    )


@dataclass(frozen=True)
class Settings:
    raw_dir: Path = field(default_factory=lambda: _path("BORDERLESS_RAW_DIR", REPO_ROOT / "pipeline" / "raw"))
    duckdb_path: Path = field(
        default_factory=lambda: _path(
            "BORDERLESS_DUCKDB_PATH", REPO_ROOT / "pipeline" / "warehouse" / "borderless.duckdb"
        )
    )
    web_data_dir: Path = field(
        default_factory=lambda: _path("BORDERLESS_WEB_DATA_DIR", REPO_ROOT / "web" / "public" / "data")
    )
    dbt_project_dir: Path = field(default_factory=lambda: _path("DBT_PROJECT_DIR", REPO_ROOT / "dbt"))
    # Raw files younger than this are reused instead of downloaded again.
    max_raw_age_days: int = int(os.environ.get("BORDERLESS_MAX_RAW_AGE_DAYS", "20"))
    sources: Sources = field(default_factory=Sources)


def get_settings() -> Settings:
    return Settings()

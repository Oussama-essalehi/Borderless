"""GDP per capita (current US$) and country metadata from the World Bank API."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Iterator

from ..config import Settings
from .common import Manifest, http_get

log = logging.getLogger(__name__)

SOURCE = "worldbank"


def _paged(url: str, params: dict[str, Any]) -> Iterator[dict[str, Any]]:
    page = 1
    while True:
        payload = http_get(url, params={**params, "format": "json", "page": page}).json()
        if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
            raise RuntimeError(f"Unexpected World Bank response for {url}: {str(payload)[:200]}")
        meta, rows = payload
        yield from rows
        if page >= int(meta["pages"]):
            return
        page += 1


def flatten_indicator(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep one record per country-year with a value."""
    return [
        {
            "iso3": row["countryiso3code"],
            "year": int(row["date"]),
            "value": row["value"],
        }
        for row in rows
        if row.get("countryiso3code") and row.get("value") is not None
    ]


def flatten_countries(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Real economies only: aggregates (regions, income groups) have region id 'NA'."""
    return [
        {
            "iso3": row["id"],
            "name": row["name"],
            "region": row["region"]["value"].strip(),
            "income_level": row["incomeLevel"]["value"].strip(),
        }
        for row in rows
        if row["region"]["id"] != "NA"
    ]


def _write_ndjson(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records))


def extract_worldbank(settings: Settings, force: bool = False) -> Path:
    out_dir = settings.raw_dir / "worldbank"
    manifest = Manifest(settings.raw_dir)
    if not force and manifest.is_fresh(SOURCE, settings.max_raw_age_days):
        log.info("World Bank data is fresh, skipping download")
        return out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    src = settings.sources
    indicator_url = f"{src.worldbank_api}/country/all/indicator/{src.worldbank_indicator}"
    countries_url = f"{src.worldbank_api}/country"

    gdp = flatten_indicator(list(_paged(indicator_url, {"date": src.worldbank_years, "per_page": 20000})))
    countries = flatten_countries(list(_paged(countries_url, {"per_page": 400})))

    gdp_path, countries_path = out_dir / "gdp_per_capita.ndjson", out_dir / "countries.ndjson"
    _write_ndjson(gdp_path, gdp)
    _write_ndjson(countries_path, countries)
    manifest.record(
        SOURCE,
        url=[indicator_url, countries_url],
        files=[gdp_path, countries_path],
        indicator=src.worldbank_indicator,
        years=src.worldbank_years,
        rows=len(gdp),
        countries=len(countries),
    )
    log.info("World Bank: %s GDP rows, %s economies", len(gdp), len(countries))
    return out_dir

from __future__ import annotations

import duckdb

from borderless_pipeline.extract.common import Manifest
from borderless_pipeline.extract.visa import extract_visa
from borderless_pipeline.load import load_raw

from .conftest import write_ndjson


def _fake_other_sources(settings):
    raw = settings.raw_dir
    gdp, wb = raw / "worldbank" / "gdp_per_capita.ndjson", raw / "worldbank" / "countries.ndjson"
    write_ndjson(gdp, [{"iso3": "FRA", "year": 2023, "value": 44460.8}])
    write_ndjson(wb, [{"iso3": "FRA", "name": "France", "region": "Europe & Central Asia", "income_level": "High"}])
    hdi = raw / "undp" / "hdi_composite_time_series.csv"
    hdi.parent.mkdir(parents=True)
    hdi.write_text("iso3,country,hdi_2022,hdi_2023\nFRA,France,0.91,0.92\n")
    ne = raw / "natural_earth" / "countries.ndjson"
    write_ndjson(ne, [{"adm0_a3": "FRA", "iso_a3": "-99", "name": "France"}])
    m = Manifest(raw)
    m.record("worldbank", url="wb", files=[gdp, wb])
    m.record("undp_hdi", url="hdi", files=[hdi])
    m.record("natural_earth", url="ne", files=[ne])


def test_load_raw_creates_all_tables(settings):
    extract_visa(settings)
    _fake_other_sources(settings)
    counts = load_raw(settings)
    assert counts["visa_requirements"] == 2 + 2 + 2
    assert counts["visa_snapshots"] == 3
    con = duckdb.connect(str(settings.duckdb_path), read_only=True)
    rows = con.sql(
        "select snapshot_date::varchar, source, passport, destination, requirement "
        "from raw.visa_requirements order by 1, 3"
    ).fetchall()
    # Old "Code" header and new "Requirement" header land in the same column.
    assert rows[0] == ("2019-11-23", "fixture", "DEU", "FRA", "3")
    assert rows[-1] == ("2025-01-12", "fixture", "FRA", "DEU", "visa free")
    assert con.sql("select count(*) from raw.source_manifest").fetchone()[0] == 4
    assert con.sql("select hdi_2023 from raw.undp_hdi").fetchone()[0] == "0.92"


def test_load_raw_is_a_full_refresh(settings):
    extract_visa(settings)
    _fake_other_sources(settings)
    load_raw(settings)
    counts = load_raw(settings)
    assert counts["visa_requirements"] == 6

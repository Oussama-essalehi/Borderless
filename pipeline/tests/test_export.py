from __future__ import annotations

import json
from pathlib import Path

import pytest

from borderless_pipeline.config import REPO_ROOT, Settings
from borderless_pipeline.export import CELL_CODES, decode_row, encode_row, write_json


def test_row_encoding_round_trips():
    cells = [("visa_free", 90, None), ("home", None, None), ("visa_free", None, None),
             ("no_admission", None, "covid_ban"), ("visa_on_arrival", None, "voa_eta_or_e_visa"), ("eta", None, None)]
    row, days = encode_row(cells)
    assert row == "FHFCYT"
    assert days == [90, 0]
    assert decode_row(row, days) == cells


def test_cell_codes_are_single_unique_characters():
    codes = list(CELL_CODES.values())
    assert all(len(c) == 1 for c in codes)
    assert len(set(codes)) == len(codes)


def test_write_json_requires_snapshot_date(tmp_path):
    with pytest.raises(ValueError):
        write_json(tmp_path / "x.json", {"rows": []})
    write_json(tmp_path / "ok.json", {"snapshot_date": "2026-02-18"})
    assert json.loads((tmp_path / "ok.json").read_text())["snapshot_date"] == "2026-02-18"


@pytest.mark.integration
def test_pipeline_end_to_end_on_fixture_data(settings, tmp_path, monkeypatch):
    """extract -> load -> dbt build -> network -> export -> changes on a tiny dataset."""
    from borderless_pipeline.cli import run_dbt
    from borderless_pipeline.export import export_all, export_changes
    from borderless_pipeline.extract.visa import extract_visa
    from borderless_pipeline.load import load_raw
    from borderless_pipeline.network import run_network

    from .test_load import _fake_other_sources

    settings = Settings(
        raw_dir=settings.raw_dir,
        duckdb_path=settings.duckdb_path,
        web_data_dir=tmp_path / "web-data",
        dbt_project_dir=REPO_ROOT / "dbt",
        sources=settings.sources,
    )
    monkeypatch.setenv("DBT_TARGET_PATH", str(tmp_path / "dbt-target"))
    monkeypatch.setenv("DBT_LOG_PATH", str(tmp_path / "dbt-logs"))

    extract_visa(settings)
    _fake_other_sources(settings)
    from borderless_pipeline.extract.geo import feature_attributes

    features = [
        {"properties": {"ADM0_A3": "FRA", "ISO_A3": "-99", "NAME": "France", "REGION_UN": "Europe",
                        "SUBREGION": "Western Europe", "LABEL_X": 2.5, "LABEL_Y": 46.6}},
        {"properties": {"ADM0_A3": "DEU", "ISO_A3": "DEU", "NAME": "Germany", "REGION_UN": "Europe",
                        "SUBREGION": "Western Europe", "LABEL_X": 10.0, "LABEL_Y": 51.1}},
    ]
    ne = settings.raw_dir / "natural_earth" / "countries.ndjson"
    ne.write_text("".join(json.dumps(a) + "\n" for a in feature_attributes({"features": features})))
    load_raw(settings)
    run_dbt(settings, "build", "--full-refresh")
    run_network(settings)
    export_all(settings)
    changes = export_changes(settings)

    out: Path = settings.web_data_dir
    files = sorted(p.relative_to(out).as_posix() for p in out.rglob("*.json"))
    assert {"meta.json", "countries.json", "scores.json", "fairness.json", "network.json",
            "wealth.json", "trip_planner.json", "changes.json"} <= set(files)
    for path in out.rglob("*.json"):
        assert "snapshot_date" in json.loads(path.read_text()), path

    meta = json.loads((out / "meta.json").read_text())
    assert meta["snapshot_date"] == "2025-01-12"
    assert [s["date"] for s in meta["snapshots"]] == ["2019-11-23", "2020-02-07", "2025-01-12"]

    latest = json.loads((out / "snapshots" / "2025-01-12.json").read_text())
    assert latest["codes"] == ["DEU", "FRA"]
    assert latest["rows"] == ["HT", "FH"]  # DEU->FRA eta, FRA->DEU visa-free

    countries = {c["iso3"]: c for c in json.loads((out / "countries.json").read_text())["countries"]}
    assert countries["FRA"]["ne"] == "FRA" and countries["FRA"]["schengen"] is True

    scores = json.loads((out / "scores.json").read_text())
    assert scores["passports"]["FRA"]["score"] == [1, 1, 1]
    assert scores["passports"]["DEU"]["score"] == [1, 1, 0]

    assert changes["changes"] == 1
    payload = json.loads((out / "changes.json").read_text())
    change = dict(zip(payload["fields"], payload["changes"][0]))
    assert (change["passport"], change["destination"], change["type"]) == ("DEU", "FRA", "new_eta")
    assert change["artefact"] is False  # a visa-free stay replaced by an ETA is a real change

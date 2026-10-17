from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta, timezone

from borderless_pipeline.extract.common import Manifest
from borderless_pipeline.extract.geo import feature_attributes
from borderless_pipeline.extract.hdi import to_utf8
from borderless_pipeline.extract.visa import extract_visa, plan_snapshots
from borderless_pipeline.extract.worldbank import flatten_countries, flatten_indicator


def test_plan_snapshots_uses_folders_then_newer_root_commits():
    tree = [
        "README.md",
        "legacy/2019-11-23/passport-index-tidy-iso3.csv",
        "legacy/2019-11-23/passport-index-matrix.csv",
        "legacy/2025-01-02/passport-index-tidy-iso3.csv",
        "passport-index-tidy-iso3.csv",
    ]
    versions = [("c3", "2025-01-12"), ("c2b", "2025-01-12"), ("c2", "2025-01-02"), ("c1", "2024-06-01")]
    plan = plan_snapshots(tree, versions)
    assert [(p.snapshot_date, p.revision) for p in plan] == [
        ("2019-11-23", "HEAD"),
        ("2025-01-02", "HEAD"),
        ("2025-01-12", "c3"),  # newest commit of the day wins; older root commits are covered by folders
    ]


def test_plan_snapshots_without_folders_keeps_every_root_version():
    plan = plan_snapshots(["passport-index-tidy-iso3.csv"], [("b", "2026-03-01"), ("a", "2026-02-18")])
    assert [p.snapshot_date for p in plan] == ["2026-02-18", "2026-03-01"]


def test_extract_visa_from_git_repository(settings):
    index = extract_visa(settings)
    rows = list(csv.DictReader(index.open()))
    assert [r["snapshot_date"] for r in rows] == ["2019-11-23", "2020-02-07", "2025-01-12"]
    latest = (index.parent / rows[-1]["file"]).read_text()
    assert "DEU,FRA,eta" in latest
    manifest = json.loads((settings.raw_dir / "_manifest.json").read_text())
    assert manifest["visa"]["snapshots"] == 3
    assert manifest["visa"]["last_snapshot"] == "2025-01-12"
    assert "downloaded_at" in manifest["visa"]


def test_extract_visa_skips_when_fresh(settings, monkeypatch):
    extract_visa(settings)
    import borderless_pipeline.extract.visa as visa

    monkeypatch.setattr(visa, "_clone", lambda *a, **k: (_ for _ in ()).throw(AssertionError("should not clone")))
    extract_visa(settings)  # cached


def test_manifest_freshness(tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    m = Manifest(tmp_path)
    m.record("src", url="u", files=[f])
    assert Manifest(tmp_path).is_fresh("src", max_age_days=1)
    entries = json.loads((tmp_path / "_manifest.json").read_text())
    entries["src"]["downloaded_at"] = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    (tmp_path / "_manifest.json").write_text(json.dumps(entries))
    assert not Manifest(tmp_path).is_fresh("src", max_age_days=20)
    f.unlink()
    assert not Manifest(tmp_path).is_fresh("src", max_age_days=10_000)


def test_worldbank_flatteners_drop_aggregates_and_nulls():
    indicator = [
        {"countryiso3code": "FRA", "date": "2023", "value": 44460.8},
        {"countryiso3code": "FRA", "date": "2024", "value": None},
        {"countryiso3code": "", "date": "2023", "value": 1.0},
    ]
    assert flatten_indicator(indicator) == [{"iso3": "FRA", "year": 2023, "value": 44460.8}]
    countries = [
        {"id": "FRA", "name": "France", "region": {"id": "ECS", "value": "Europe & Central Asia "},
         "incomeLevel": {"value": "High income"}},
        {"id": "WLD", "name": "World", "region": {"id": "NA", "value": "Aggregates"}, "incomeLevel": {"value": ""}},
    ]
    assert flatten_countries(countries) == [
        {"iso3": "FRA", "name": "France", "region": "Europe & Central Asia", "income_level": "High income"}
    ]


def test_to_utf8_handles_windows_1252():
    assert to_utf8("Côte d'Ivoire".encode("cp1252")) == "Côte d'Ivoire"
    assert to_utf8("Türkiye".encode("utf-8")) == "Türkiye"


def test_feature_attributes_lowercases_selected_properties():
    geojson = {"features": [{"properties": {"ADM0_A3": "FRA", "ISO_A3": "-99", "NAME": "France", "EXTRA": 1}}]}
    (attrs,) = feature_attributes(geojson)
    assert attrs["adm0_a3"] == "FRA" and attrs["iso_a3"] == "-99" and attrs["name"] == "France"
    assert "extra" not in attrs and attrs["continent"] is None

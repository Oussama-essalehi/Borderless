"""Natural Earth 1:50m admin-0 countries.

The full GeoJSON is cached for the front-end geometry build; the feature
properties (names, codes, continent, subregion, label point) are written as
NDJSON for the country dimension in DuckDB.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from ..config import Settings
from .common import Manifest, http_get, sha256_bytes

log = logging.getLogger(__name__)

SOURCE = "natural_earth"

KEEP_PROPERTIES = (
    "ADMIN", "NAME", "NAME_LONG", "NAME_FR", "SOVEREIGNT", "TYPE",
    "ADM0_A3", "ISO_A3", "ISO_A3_EH", "ISO_A2", "ISO_A2_EH", "WB_A3",
    "CONTINENT", "REGION_UN", "SUBREGION", "REGION_WB",
    "LABEL_X", "LABEL_Y", "POP_EST",
)


def feature_attributes(geojson: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {key.lower(): feature["properties"].get(key) for key in KEEP_PROPERTIES}
        for feature in geojson["features"]
    ]


def extract_geo(settings: Settings, force: bool = False) -> Path:
    out_dir = settings.raw_dir / "natural_earth"
    geo_path = out_dir / "ne_50m_admin_0_countries.geojson"
    attr_path = out_dir / "countries.ndjson"
    manifest = Manifest(settings.raw_dir)
    if not force and manifest.is_fresh(SOURCE, settings.max_raw_age_days):
        log.info("Natural Earth data is fresh, skipping download")
        return geo_path
    out_dir.mkdir(parents=True, exist_ok=True)
    data = http_get(settings.sources.natural_earth_geojson).content
    geojson = json.loads(data)
    attributes = feature_attributes(geojson)
    geo_path.write_bytes(data)
    attr_path.write_text("".join(json.dumps(a, ensure_ascii=False) + "\n" for a in attributes))
    manifest.record(
        SOURCE,
        url=settings.sources.natural_earth_geojson,
        files=[geo_path, attr_path],
        features=len(attributes),
        sha256=sha256_bytes(data),
    )
    log.info("Natural Earth: %s features", len(attributes))
    return geo_path

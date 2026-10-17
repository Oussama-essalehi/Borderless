"""UNDP Human Development Index (composite indices, complete time series)."""

from __future__ import annotations

import logging
from pathlib import Path

from ..config import Settings
from .common import Manifest, http_get, sha256_bytes

log = logging.getLogger(__name__)

SOURCE = "undp_hdi"


def to_utf8(data: bytes) -> str:
    """The UNDP CSV has shipped as both UTF-8 and Windows-1252 over the years."""
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("unreachable: latin-1 decodes any byte string")


def extract_hdi(settings: Settings, force: bool = False) -> Path:
    out_dir = settings.raw_dir / "undp"
    path = out_dir / "hdi_composite_time_series.csv"
    manifest = Manifest(settings.raw_dir)
    if not force and manifest.is_fresh(SOURCE, settings.max_raw_age_days):
        log.info("HDI data is fresh, skipping download")
        return path
    out_dir.mkdir(parents=True, exist_ok=True)
    data = http_get(settings.sources.hdi_csv).content
    text = to_utf8(data)
    header = text.split("\n", 1)[0].lower()
    if "iso3" not in header or "hdi_" not in header:
        raise RuntimeError("HDI file does not look like the composite indices time series")
    path.write_text(text, encoding="utf-8")
    manifest.record(SOURCE, url=settings.sources.hdi_csv, files=[path], sha256=sha256_bytes(data))
    log.info("HDI: %s bytes", len(data))
    return path

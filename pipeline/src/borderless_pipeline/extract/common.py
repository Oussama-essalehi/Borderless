"""HTTP helpers and the raw-download manifest."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

log = logging.getLogger(__name__)

USER_AGENT = "borderless-pipeline/0.1 (+https://github.com/Oussama-essalehi/Borderless)"


def http_get(url: str, *, params: dict | None = None, timeout: int = 120, retries: int = 4) -> requests.Response:
    """GET with exponential backoff on network errors and 5xx/429 responses."""
    delay = 2.0
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(url, params=params, timeout=timeout, headers={"User-Agent": USER_AGENT})
            if response.status_code < 500 and response.status_code != 429:
                response.raise_for_status()
                return response
            log.warning("GET %s -> HTTP %s (attempt %s/%s)", url, response.status_code, attempt, retries)
        except (requests.ConnectionError, requests.Timeout) as exc:
            log.warning("GET %s failed: %s (attempt %s/%s)", url, exc, attempt, retries)
        if attempt == retries:
            break
        time.sleep(delay)
        delay *= 2
    raise RuntimeError(f"Giving up on {url} after {retries} attempts")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Manifest:
    """raw/_manifest.json: when and from where each source was downloaded."""

    def __init__(self, raw_dir: Path):
        self.path = raw_dir / "_manifest.json"
        self.entries: dict[str, dict[str, Any]] = {}
        if self.path.exists():
            self.entries = json.loads(self.path.read_text())

    def record(self, source: str, *, url: str | list[str], files: list[Path], **details: Any) -> dict[str, Any]:
        entry = {
            "source": source,
            "url": url,
            "downloaded_at": utc_now(),
            "files": sorted(str(f.relative_to(self.path.parent)) for f in files),
            **details,
        }
        # Re-read so concurrent extractors (parallel Airflow tasks) don't drop each other's entries.
        if self.path.exists():
            self.entries = json.loads(self.path.read_text())
        self.entries[source] = entry
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(f".{source}.tmp")
        tmp.write_text(json.dumps(self.entries, indent=2, sort_keys=True))
        tmp.replace(self.path)
        return entry

    def is_fresh(self, source: str, max_age_days: int) -> bool:
        entry = self.entries.get(source)
        if not entry:
            return False
        if not all((self.path.parent / f).exists() for f in entry.get("files", [])):
            return False
        downloaded = datetime.fromisoformat(entry["downloaded_at"])
        return (datetime.now(timezone.utc) - downloaded).days < max_age_days

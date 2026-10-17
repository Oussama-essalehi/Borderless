"""Visa requirement snapshots from the Passport Index datasets.

Each source repository is cloned without file contents (partial clone) and
only the ISO-3 tidy CSVs are materialised:

* dated folders (``legacy/YYYY-MM-DD/`` or ``history/YYYY-MM-DD/``), and
* every committed version of the root ``passport-index-tidy-iso3.csv`` that is
  newer than the newest dated folder, dated by its commit.

Output: ``raw/visa/<date>__<source>.csv`` plus ``raw/visa/snapshots.csv``.
"""

from __future__ import annotations

import csv
import logging
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from ..config import Settings
from .common import Manifest, sha256_bytes

log = logging.getLogger(__name__)

SOURCE = "visa"
TIDY_FILE = "passport-index-tidy-iso3.csv"
FOLDER_RE = re.compile(r"^(?:legacy|history)/(\d{4}-\d{2}-\d{2})/" + re.escape(TIDY_FILE) + "$")


@dataclass(frozen=True)
class PlannedSnapshot:
    snapshot_date: str
    revision: str
    path: str


def _git(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)
    return result.stdout


def _git_bytes(args: list[str], cwd: Path) -> bytes:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, check=True).stdout


def plan_snapshots(tree_paths: list[str], root_versions: list[tuple[str, str]]) -> list[PlannedSnapshot]:
    """Pick which files to materialise from one repository.

    ``tree_paths`` are the paths at HEAD; ``root_versions`` are
    ``(commit, YYYY-MM-DD)`` pairs for the root tidy file, newest first.
    """
    planned: dict[str, PlannedSnapshot] = {}
    for path in tree_paths:
        match = FOLDER_RE.match(path)
        if match:
            planned[match.group(1)] = PlannedSnapshot(match.group(1), "HEAD", path)

    newest_folder = max(planned) if planned else ""
    for commit, day in root_versions:
        # Commits are newest first, so the first one seen for a day is that day's final state.
        if day > newest_folder and day not in planned:
            planned[day] = PlannedSnapshot(day, commit, TIDY_FILE)
    return [planned[d] for d in sorted(planned)]


def _clone(url: str, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    _git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", url, str(dest)])


def extract_visa(settings: Settings, force: bool = False) -> Path:
    out_dir = settings.raw_dir / "visa"
    manifest = Manifest(settings.raw_dir)
    index_path = out_dir / "snapshots.csv"
    if not force and manifest.is_fresh(SOURCE, settings.max_raw_age_days):
        log.info("visa snapshots are fresh, skipping download")
        return index_path

    repos_dir = out_dir / "_repos"
    for old in out_dir.glob("*__*.csv"):
        old.unlink()

    rows: list[dict[str, str]] = []
    for name, url in settings.sources.visa_repos:
        repo = repos_dir / name
        log.info("cloning %s", url)
        _clone(url, repo)
        tree = _git(["ls-tree", "-r", "--name-only", "HEAD"], cwd=repo).splitlines()
        versions = [
            tuple(line.split(" ", 1))
            for line in _git(["log", "--format=%H %cs", "HEAD", "--", TIDY_FILE], cwd=repo).splitlines()
            if line
        ]
        for snap in plan_snapshots(tree, versions):  # type: ignore[arg-type]
            content = _git_bytes(["show", f"{snap.revision}:{snap.path}"], cwd=repo)
            target = out_dir / f"{snap.snapshot_date}__{name}.csv"
            target.write_bytes(content)
            commit = _git(["rev-parse", snap.revision], cwd=repo).strip()
            rows.append(
                {
                    "snapshot_date": snap.snapshot_date,
                    "source": name,
                    "file": target.name,
                    "repo_url": url,
                    "git_commit": commit,
                    "git_path": snap.path,
                    "sha256": sha256_bytes(content),
                }
            )

    # If two repositories publish the same day, keep the later (successor) one.
    by_date: dict[str, dict[str, str]] = {}
    for row in rows:
        previous = by_date.get(row["snapshot_date"])
        if previous:
            (out_dir / previous["file"]).unlink(missing_ok=True)
        by_date[row["snapshot_date"]] = row
    rows = [by_date[d] for d in sorted(by_date)]

    with index_path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    manifest.record(
        SOURCE,
        url=[u for _, u in settings.sources.visa_repos],
        files=[index_path, *(out_dir / r["file"] for r in rows)],
        snapshots=len(rows),
        first_snapshot=rows[0]["snapshot_date"],
        last_snapshot=rows[-1]["snapshot_date"],
    )
    log.info("visa: %s snapshots (%s -> %s)", len(rows), rows[0]["snapshot_date"], rows[-1]["snapshot_date"])
    return index_path

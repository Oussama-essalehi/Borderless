from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from borderless_pipeline.config import Settings, Sources


def git(repo: Path, *args: str, date: str | None = None) -> None:
    env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.com", "PATH": "/usr/bin:/bin"}
    if date:
        env |= {"GIT_AUTHOR_DATE": f"{date}T12:00:00", "GIT_COMMITTER_DATE": f"{date}T12:00:00"}
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, env=env)


TIDY_HEADER_OLD = "Passport,Destination,Code\n"
TIDY_HEADER_NEW = "Passport,Destination,Requirement\n"


@pytest.fixture
def visa_repo(tmp_path: Path) -> Path:
    """A tiny Passport-Index-like repository: two legacy folders + two root commits."""
    repo = tmp_path / "src-repo"
    repo.mkdir()
    git(repo, "init", "-q", "-b", "master")
    legacy = repo / "legacy"
    (legacy / "2019-11-23").mkdir(parents=True)
    (legacy / "2019-11-23" / "passport-index-tidy-iso3.csv").write_text(TIDY_HEADER_OLD + "FRA,DEU,3\nDEU,FRA,3\n")
    (legacy / "2020-02-07").mkdir()
    (legacy / "2020-02-07" / "passport-index-tidy-iso3.csv").write_text(TIDY_HEADER_OLD + "FRA,DEU,VF\nDEU,FRA,90\n")
    (repo / "passport-index-tidy-iso3.csv").write_text(TIDY_HEADER_NEW + "FRA,DEU,visa free\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "old", date="2020-02-07")
    (repo / "passport-index-tidy-iso3.csv").write_text(TIDY_HEADER_NEW + "FRA,DEU,visa free\nDEU,FRA,eta\n")
    git(repo, "commit", "-q", "-am", "new", date="2025-01-12")
    (repo / "README.md").write_text("docs only\n")
    git(repo, "add", "README.md")
    git(repo, "commit", "-q", "-m", "readme", date="2026-02-18")
    return repo


@pytest.fixture
def settings(tmp_path: Path, visa_repo: Path) -> Settings:
    return Settings(
        raw_dir=tmp_path / "raw",
        duckdb_path=tmp_path / "warehouse" / "test.duckdb",
        web_data_dir=tmp_path / "web-data",
        dbt_project_dir=tmp_path / "dbt",
        sources=Sources(visa_repos=(("fixture", visa_repo.as_uri()),)),
    )


def write_ndjson(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows))

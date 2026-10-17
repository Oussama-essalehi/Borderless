"""Export the marts to static JSON for the front-end (web/public/data).

Every file carries a top-level "snapshot_date". The latest snapshot's files
are small and loaded up front; one file per historical snapshot is written
under snapshots/ so the front-end can fetch them only when needed.

Snapshot matrices are stored as one string per passport, one character per
destination (see CELL_CODES), plus the visa-free stay in days for each 'F'
cell of the row, in order (0 when the source gives no number).
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .config import Settings
from .load import connect
from .network import BLOC_PRECISION, BLOC_RECALL, EDGE_WEIGHTS, LOUVAIN_RESOLUTION, MIN_SPLIT_MODULARITY

log = logging.getLogger(__name__)

CATEGORIES: list[dict[str, str]] = [
    {"key": "visa_free", "label": "Visa-free", "description": "No visa needed; maximum stay in days when known."},
    {"key": "visa_on_arrival", "label": "Visa on arrival", "description": "Visa issued at the border."},
    {"key": "eta", "label": "ETA", "description": "Electronic travel authorisation applied for online before travel."},
    {"key": "e_visa", "label": "e-Visa", "description": "Visa applied for and issued online."},
    {"key": "visa_required", "label": "Visa required", "description": "Visa from an embassy or consulate before travel."},
    {"key": "no_admission", "label": "No admission", "description": "Entry not permitted (travel bans, conflicts, COVID-19 bans)."},
    {"key": "home", "label": "Home country", "description": "Passport and destination are the same."},
]
CATEGORY_INDEX = {c["key"]: i + 1 for i, c in enumerate(CATEGORIES)}
# One character per (category, detail). Details keep the source's nuance:
# COVID-19 bans, Qatar's 2022 Hayya permit, the UK electronic visa waiver and
# the pre-2025 buckets where ETAs and e-visas are not distinguished.
CELL_CODES: dict[tuple[str, str | None], str] = {
    ("visa_free", None): "F",
    ("visa_on_arrival", None): "A",
    ("eta", None): "T",
    ("eta", "uk_electronic_visa_waiver"): "W",
    ("e_visa", None): "E",
    ("e_visa", "eta_or_e_visa"): "X",
    ("e_visa", "hayya_entry_permit"): "Q",
    ("visa_required", None): "V",
    ("no_admission", None): "N",
    ("no_admission", "covid_ban"): "C",
    ("home", None): "H",
}
CODE_MEANING = {code: {"category": cat, "detail": detail} for (cat, detail), code in CELL_CODES.items()}


def encode_row(cells: list[tuple[str, int | None, str | None]]) -> tuple[str, list[int]]:
    """cells: (category, days, detail) per destination, in column order."""
    row = "".join(CELL_CODES[(category, detail)] for category, _, detail in cells)
    days = [d or 0 for category, d, _ in cells if category == "visa_free"]
    return row, days


def decode_row(row: str, days: list[int]) -> list[tuple[str, int | None, str | None]]:
    it = iter(days)
    out = []
    for code in row:
        meaning = CODE_MEANING[code]
        d = (next(it) or None) if meaning["category"] == "visa_free" else None
        out.append((meaning["category"], d, meaning["detail"]))
    return out


def _json_default(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"not JSON serialisable: {type(value)}")


def write_json(path: Path, payload: dict[str, Any]) -> int:
    if "snapshot_date" not in payload:
        raise ValueError(f"{path.name}: every exported file needs a snapshot_date")
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, default=_json_default)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)
    return len(text)


def _rows(con, query: str, params: list | None = None) -> list[dict[str, Any]]:
    cursor = con.execute(query, params or [])
    names = [d[0] for d in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def _round(value: float | None, digits: int) -> float | None:
    return None if value is None else round(value, digits)


def export_all(settings: Settings) -> dict[str, int]:
    out = settings.web_data_dir
    out.mkdir(parents=True, exist_ok=True)
    sizes: dict[str, int] = {}
    con = connect(settings, read_only=True)
    try:
        snapshots = _rows(con, """
            select s.*,
                   count(*) filter (where v.category_detail = 'covid_ban') as covid_ban_pairs,
                   count(*) filter (where v.category = 'eta')              as eta_pairs
            from marts.dim_snapshot s
            join marts.visa_access v using (snapshot_date)
            group by all
            order by s.snapshot_date
        """)
        latest = snapshots[-1]["snapshot_date"]
        codes = [r["iso3"] for r in _rows(con, """
            select distinct passport_iso3 as iso3 from marts.visa_access
            where snapshot_date = ? order by 1""", [latest])]

        # --- one matrix per snapshot (lazy-loaded except the latest) -----------
        snap_dir = out / "snapshots"
        if snap_dir.exists():
            shutil.rmtree(snap_dir)
        for snap in snapshots:
            day = snap["snapshot_date"]
            cells = con.execute("""
                select passport_iso3, destination_iso3, category, visa_free_days, category_detail
                from marts.visa_access where snapshot_date = ?""", [day]).fetchall()
            snap_codes = sorted({c[0] for c in cells})
            pos = {iso3: i for i, iso3 in enumerate(snap_codes)}
            grid: list[list] = [[None] * len(snap_codes) for _ in snap_codes]
            for p, d, cat, days, detail in cells:
                grid[pos[p]][pos[d]] = (cat, days, detail)
            encoded = [encode_row(row) for row in grid]
            snap["file"] = f"snapshots/{day.isoformat()}.json"
            sizes[snap["file"]] = write_json(out / snap["file"], {
                "snapshot_date": day,
                "codes": snap_codes,
                "rows": [r for r, _ in encoded],
                "days": [d for _, d in encoded],
            })

        # --- meta ------------------------------------------------------------------
        manifest = _rows(con, "select source, url, downloaded_at from raw.source_manifest order by source")
        events = _rows(con, "select event_date as date, kind, title, description from seeds.notable_events order by 1")
        sizes["meta.json"] = write_json(out / "meta.json", {
            "snapshot_date": latest,
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0),
            "categories": CATEGORIES,
            "cell_codes": CODE_MEANING,
            "snapshots": [
                {
                    "date": s["snapshot_date"],
                    "file": s["file"],
                    "source": s["source"],
                    "value_format": s["value_format"],
                    "eta_is_distinct": s["eta_is_distinct"],
                    "source_changed": s["previous_source"] is not None and s["previous_source"] != s["source"],
                    "passports": s["passports"],
                    "covid_ban_pairs": s["covid_ban_pairs"],
                    "eta_pairs": s["eta_pairs"],
                }
                for s in snapshots
            ],
            "events": events,
            "sources": [
                {"source": m["source"], "url": json.loads(m["url"]), "downloaded_at": m["downloaded_at"]}
                for m in manifest
            ],
        })

        # --- countries -------------------------------------------------------------
        countries = _rows(con, """
            select c.iso3, c.name, c.region, c.subregion, c.ne_adm0_a3, c.is_schengen, c.blocs,
                   c.income_level, c.label_lon, c.label_lat, c.in_visa_data,
                   w.gdp_per_capita_usd, w.gdp_year, w.hdi, w.hdi_year
            from marts.dim_country c
            left join marts.openness_vs_wealth w using (iso3)
            order by c.iso3""")
        sizes["countries.json"] = write_json(out / "countries.json", {
            "snapshot_date": latest,
            "countries": [
                {
                    "iso3": c["iso3"],
                    "name": c["name"],
                    "region": c["region"],
                    "subregion": c["subregion"],
                    "ne": c["ne_adm0_a3"],
                    "schengen": c["is_schengen"],
                    "blocs": c["blocs"],
                    "income": c["income_level"],
                    "lon": _round(c["label_lon"], 3),
                    "lat": _round(c["label_lat"], 3),
                    "visa_data": c["in_visa_data"],
                    "gdp": _round(c["gdp_per_capita_usd"], 0),
                    "gdp_year": c["gdp_year"],
                    "hdi": _round(c["hdi"], 3),
                    "hdi_year": c["hdi_year"],
                }
                for c in countries
            ],
        })

        # --- scores over time ------------------------------------------------------------
        dates = [s["snapshot_date"] for s in snapshots]
        date_pos = {d: i for i, d in enumerate(dates)}
        series: dict[str, dict[str, list]] = {}
        for r in _rows(con, "select snapshot_date, passport_iso3, visa_free_score, world_rank, mobility_score from marts.passport_scores"):
            entry = series.setdefault(r["passport_iso3"], {
                "score": [None] * len(dates), "rank": [None] * len(dates), "mobility": [None] * len(dates)})
            i = date_pos[r["snapshot_date"]]
            entry["score"][i], entry["rank"][i], entry["mobility"][i] = r["visa_free_score"], r["world_rank"], r["mobility_score"]
        sizes["scores.json"] = write_json(out / "scores.json", {
            "snapshot_date": latest,
            "dates": dates,
            "definition": "visa_free_score = visa-free + visa on arrival destinations; rank ties share a rank",
            "passports": series,
        })

        # --- fairness ----------------------------------------------------------------------
        fairness = _rows(con, """
            select country_iso3 as iso3, fairness_score, reciprocity_balance, asymmetric_share,
                   n_partners, n_symmetric, n_favorable, n_unfavorable, fairness_rank
            from marts.fairness_scores where snapshot_date = ? order by fairness_rank, iso3""", [latest])
        sizes["fairness.json"] = write_json(out / "fairness.json", {
            "snapshot_date": latest,
            "tiers": {"4": "visa-free or on arrival", "3": "ETA", "2": "e-visa", "1": "visa required or no admission"},
            "countries": fairness,
        })

        # --- network -----------------------------------------------------------------------
        metrics = _rows(con, """
            select m.iso3, m.passport_power, m.openness, m.pagerank, m.free_out, m.free_in, c.community_id
            from analytics.network_metrics m
            left join analytics.network_communities c using (snapshot_date, iso3)
            where m.snapshot_date = ? order by m.iso3""", [latest])
        labels = _rows(con, """
            select community_id, label, size, top_subregion, blocs
            from analytics.network_community_labels where snapshot_date = ? order by community_id""", [latest])
        sizes["network.json"] = write_json(out / "network.json", {
            "snapshot_date": latest,
            "method": {
                "edge_weights": EDGE_WEIGHTS,
                "louvain_resolution": LOUVAIN_RESOLUTION,
                "min_split_modularity": MIN_SPLIT_MODULARITY,
                "bloc_label_thresholds": {"share_of_bloc": BLOC_RECALL, "share_of_community": BLOC_PRECISION},
            },
            "countries": [
                {**m, "pagerank": _round(m["pagerank"] * 1000, 3)} for m in metrics
            ],
            "communities": [{**l, "blocs": json.loads(l["blocs"])} for l in labels],
        })

        # --- openness vs wealth -----------------------------------------------------------------
        wealth = _rows(con, "select * from marts.openness_vs_wealth order by iso3")
        first = wealth[0]
        sizes["wealth.json"] = write_json(out / "wealth.json", {
            "snapshot_date": latest,
            "gdp": {"r": _round(first["r_score_log_gdp"], 3), "n": first["n_gdp"],
                    "slope": _round(first["slope_log_gdp"], 4), "intercept": _round(first["intercept_log_gdp"], 4),
                    "x": "log10 GDP per capita (current US$)"},
            "hdi": {"r": _round(first["r_score_hdi"], 3), "n": first["n_hdi"],
                    "slope": _round(first["slope_hdi"], 4), "intercept": _round(first["intercept_hdi"], 4),
                    "x": "Human Development Index"},
            "points": [
                {
                    "iso3": w["iso3"], "score": w["visa_free_score"], "openness": w["openness_score"],
                    "gdp": _round(w["gdp_per_capita_usd"], 0), "gdp_year": w["gdp_year"],
                    "hdi": _round(w["hdi"], 3), "hdi_year": w["hdi_year"],
                    "residual_gdp": _round(w["residual_gdp"], 1), "residual_hdi": _round(w["residual_hdi"], 1),
                }
                for w in wealth
            ],
        })

        # --- trip planner -----------------------------------------------------------------------
        trips: dict[str, list] = {}
        for r in _rows(con, """
            select passport_iso3, destination_iso3, category, visa_free_days
            from marts.trip_planner
            order by passport_iso3, visa_free_days desc nulls last, destination_name"""):
            trips.setdefault(r["passport_iso3"], []).append(
                [r["destination_iso3"], CATEGORY_INDEX[r["category"]], r["visa_free_days"]])
        sizes["trip_planner.json"] = write_json(out / "trip_planner.json", {
            "snapshot_date": latest,
            "fields": ["destination", "category", "days"],
            "passports": trips,
        })
    finally:
        con.close()
    log.info("exported %s files, %.1f KB in total", len(sizes), sum(sizes.values()) / 1024)
    return sizes


CHANGE_TYPES = ["gained_visa_free", "lost_visa_free", "new_eta", "eta_removed", "eased", "tightened", "stay_changed"]


def export_changes(settings: Settings) -> dict[str, Any]:
    """changes.json: what changed between the two latest snapshots, plus a
    per-snapshot timeline of change counts for the history view."""
    con = connect(settings, read_only=True)
    try:
        latest, previous, source_changed = con.execute("""
            select snapshot_date, previous_snapshot_date, previous_source <> source
            from marts.dim_snapshot where is_latest""").fetchone()
        changes = con.execute("""
            select passport_iso3, destination_iso3, previous_category, category,
                   previous_visa_free_days, visa_free_days, change_type, is_methodology_artifact
            from marts.snapshot_changes where snapshot_date = ?
            order by change_type, passport_iso3, destination_iso3""", [latest]).fetchall()
        timeline = _rows(con, f"""
            select s.snapshot_date as date, s.previous_snapshot_date as previous,
                   coalesce(s.previous_source <> s.source, false) as source_changed,
                   {", ".join(f"count(c.change_type) filter (where c.change_type = '{t}' and not c.is_methodology_artifact) as {t}" for t in CHANGE_TYPES)},
                   count(c.change_type) filter (where c.is_methodology_artifact) as artefacts
            from marts.dim_snapshot s
            left join marts.snapshot_changes c using (snapshot_date)
            where s.previous_snapshot_date is not null
            group by all order by 1""")
    finally:
        con.close()
    summary = {t: sum(1 for c in changes if c[6] == t) for t in CHANGE_TYPES}
    payload = {
        "snapshot_date": latest,
        "previous_snapshot_date": previous,
        "source_changed": bool(source_changed),
        "days_between": (latest - previous).days,
        "summary": summary,
        "fields": ["passport", "destination", "from", "to", "from_days", "to_days", "type", "artefact"],
        "changes": [list(c) for c in changes],
        "timeline": timeline,
    }
    size = write_json(settings.web_data_dir / "changes.json", payload)
    log.info("changes: %s pairs changed between %s and %s (%.1f KB)", len(changes), previous, latest, size / 1024)
    return {"changes": len(changes), "previous": previous, "latest": latest}

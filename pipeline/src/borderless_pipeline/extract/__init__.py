"""Extractors. Each one writes files under the raw directory and records the
download in raw/_manifest.json; none of them touches DuckDB, so they can run
in parallel."""

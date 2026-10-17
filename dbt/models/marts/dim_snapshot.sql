select
    snapshot_date,
    snapshot_index,
    previous_snapshot_date,
    is_latest,
    source,
    previous_source,
    repo_url,
    git_commit,
    value_format,
    eta_is_distinct,
    is_first_eta_snapshot,
    passports,
    pairs
from {{ ref('int_snapshots') }}

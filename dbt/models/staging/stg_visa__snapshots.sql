select
    cast(snapshot_date as date) as snapshot_date,
    source,
    repo_url,
    git_commit,
    git_path,
    sha256,
    _downloaded_at              as downloaded_at
from {{ source('raw', 'visa_snapshots') }}

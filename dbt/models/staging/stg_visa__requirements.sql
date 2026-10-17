select
    snapshot_date,
    source,
    upper(trim(passport))     as passport_iso3,
    upper(trim(destination))  as destination_iso3,
    trim(requirement)         as requirement_raw,
    lower(trim(requirement))  as requirement_key,
    _downloaded_at            as downloaded_at
from {{ source('raw', 'visa_requirements') }}

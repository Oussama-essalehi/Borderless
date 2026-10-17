-- Snapshot-level facts, including which value format the snapshot uses:
--   numeric_code  2019 files: 0-3 codes, no day counts
--   short_code    early 2020: VF / VOA / ETA / VR plus day counts
--   label         from late 2020: text labels plus day counts
with values as (
    select
        snapshot_date,
        bool_or(requirement_raw in ('VF', 'VOA', 'VR', 'ETA'))     as has_short_codes,
        bool_and(regexp_full_match(requirement_raw, '-?[0-3]'))     as only_small_codes,
        bool_or(requirement_raw = 'eta')                           as has_eta_label,
        count(distinct passport_iso3)                              as passports,
        count(*)                                                   as pairs
    from {{ ref('stg_visa__requirements') }}
    group by snapshot_date
),

formatted as (
    select
        s.snapshot_date,
        s.source,
        s.repo_url,
        s.git_commit,
        case
            when v.has_short_codes then 'short_code'
            when v.only_small_codes then 'numeric_code'
            else 'label'
        end as value_format,
        v.passports,
        v.pairs
    from {{ ref('stg_visa__snapshots') }} s
    join values v using (snapshot_date)
),

eta_split as (
    -- First snapshot in which ETAs are published separately from e-visas.
    select min(snapshot_date) as first_eta_snapshot
    from values
    where has_eta_label
)

select
    f.*,
    row_number() over (order by f.snapshot_date)                         as snapshot_index,
    lag(f.snapshot_date) over (order by f.snapshot_date)                 as previous_snapshot_date,
    lag(f.value_format) over (order by f.snapshot_date)                  as previous_value_format,
    lag(f.source) over (order by f.snapshot_date)                        as previous_source,
    f.snapshot_date >= e.first_eta_snapshot                              as eta_is_distinct,
    f.snapshot_date = e.first_eta_snapshot                               as is_first_eta_snapshot,
    f.snapshot_date = max(f.snapshot_date) over ()                       as is_latest
from formatted f
cross join eta_split e

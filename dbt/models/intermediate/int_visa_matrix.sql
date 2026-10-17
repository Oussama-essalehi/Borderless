-- Every snapshot x passport x destination with a harmonised access category.
-- 2019 snapshots don't include passport = destination rows; they are added
-- so every snapshot is a complete square matrix.
with requirements as (
    select r.*, s.value_format
    from {{ ref('stg_visa__requirements') }} r
    join {{ ref('int_snapshots') }} s using (snapshot_date)
),

mapped as (
    select
        r.snapshot_date,
        r.value_format,
        r.passport_iso3,
        r.destination_iso3,
        r.requirement_raw,
        case
            when r.value_format <> 'numeric_code' and regexp_full_match(r.requirement_raw, '\d+') then 'visa_free'
            else m.category
        end as category,
        m.category_detail,
        case
            when r.value_format <> 'numeric_code' and regexp_full_match(r.requirement_raw, '\d+')
                then cast(r.requirement_raw as integer)
        end as visa_free_days
    from requirements r
    left join {{ ref('requirement_mapping') }} m
        on m.value_format = r.value_format
       and cast(m.requirement_key as varchar) = r.requirement_key
),

missing_home as (
    select distinct
        snapshot_date,
        value_format,
        passport_iso3,
        passport_iso3     as destination_iso3,
        null              as requirement_raw,
        'home'            as category,
        null              as category_detail,
        null::integer     as visa_free_days
    from mapped
    where not exists (
        select 1 from mapped h
        where h.snapshot_date = mapped.snapshot_date
          and h.passport_iso3 = mapped.passport_iso3
          and h.destination_iso3 = mapped.passport_iso3
    )
),

unioned as (
    select * from mapped
    union all
    select * from missing_home
)

select
    snapshot_date,
    passport_iso3,
    destination_iso3,
    category,
    category_detail,
    visa_free_days,
    requirement_raw,
    value_format,
    {{ ease_rank('category') }}                              as ease_rank,
    {{ access_tier('category') }}                            as access_tier,
    category in ('visa_free', 'visa_on_arrival')             as no_advance_application
from unioned

-- Each pair's access next to its access in the previous snapshot.
select
    m.snapshot_date,
    s.previous_snapshot_date,
    m.passport_iso3,
    m.destination_iso3,
    m.category,
    m.visa_free_days,
    m.access_tier,
    m.ease_rank,
    m.category_detail,
    lag(m.category)       over pair as previous_category,
    lag(m.category_detail) over pair as previous_category_detail,
    lag(m.visa_free_days) over pair as previous_visa_free_days,
    lag(m.access_tier)    over pair as previous_access_tier,
    lag(m.ease_rank)      over pair as previous_ease_rank,
    s.value_format,
    s.previous_value_format,
    s.is_first_eta_snapshot,
    s.source <> s.previous_source   as crosses_source_change
from {{ ref('int_visa_matrix') }} m
join {{ ref('int_snapshots') }} s using (snapshot_date)
window pair as (partition by m.passport_iso3, m.destination_iso3 order by m.snapshot_date)

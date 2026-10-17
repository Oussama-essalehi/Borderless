-- Every pair whose access changed from one snapshot to the next.
with changed as (
    select *
    from {{ ref('int_snapshot_history') }}
    where previous_category is not null
      and (
          category <> previous_category
          or coalesce(visa_free_days, -1) <> coalesce(previous_visa_free_days, -1)
      )
)

select
    snapshot_date,
    previous_snapshot_date,
    passport_iso3,
    destination_iso3,
    previous_category,
    category,
    previous_visa_free_days,
    visa_free_days,
    case
        when category = 'eta' and previous_category <> 'eta'                      then 'new_eta'
        when category <> 'eta' and previous_category = 'eta'
             and access_tier = {{ var('free_tier') }}                              then 'gained_visa_free'
        when category <> 'eta' and previous_category = 'eta'                       then 'eta_removed'
        when access_tier = {{ var('free_tier') }}
             and previous_access_tier < {{ var('free_tier') }}                     then 'gained_visa_free'
        when access_tier < {{ var('free_tier') }}
             and previous_access_tier = {{ var('free_tier') }}                     then 'lost_visa_free'
        when ease_rank > previous_ease_rank                                        then 'eased'
        when ease_rank < previous_ease_rank                                        then 'tightened'
        else 'stay_changed'
    end as change_type,
    sign(coalesce(ease_rank, 0) - coalesce(previous_ease_rank, 0))::integer as direction,
    previous_access_tier = {{ var('free_tier') }} and access_tier < {{ var('free_tier') }} as lost_visa_free,
    previous_access_tier < {{ var('free_tier') }} and access_tier = {{ var('free_tier') }} as gained_visa_free,
    -- Changes that come from how the data was recorded rather than from policy:
    -- day counts first published in 2020, and ETAs split out of e-visas in 2025.
    (previous_value_format = 'numeric_code' and category = previous_category)
        or (is_first_eta_snapshot and 'eta' in (category, previous_category)
            and 'e_visa' in (category, previous_category))                         as is_methodology_artifact,
    crosses_source_change
from changed

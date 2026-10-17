-- Per snapshot and passport: destinations by category, the visa-free score
-- (visa-free + visa on arrival, comparable across every snapshot) and the
-- world rank (ties share a rank, like the published passport indices).
with counts as (
    select
        snapshot_date,
        passport_iso3,
        count(*) filter (where category = 'visa_free')         as n_visa_free,
        count(*) filter (where category = 'visa_on_arrival')   as n_visa_on_arrival,
        count(*) filter (where category = 'eta')               as n_eta,
        count(*) filter (where category = 'e_visa')            as n_e_visa,
        count(*) filter (where category = 'visa_required')     as n_visa_required,
        count(*) filter (where category = 'no_admission')      as n_no_admission,
        count(*) filter (where category <> 'home')             as n_destinations
    from {{ ref('int_visa_matrix') }}
    group by all
),

scored as (
    select
        *,
        n_visa_free + n_visa_on_arrival                       as visa_free_score,
        n_visa_free + n_visa_on_arrival + n_eta               as mobility_score
    from counts
)

select
    *,
    rank() over (partition by snapshot_date order by visa_free_score desc)          as world_rank,
    count(*) over (partition by snapshot_date)                                       as passports_ranked,
    visa_free_score
        - lag(visa_free_score) over (partition by passport_iso3 order by snapshot_date) as score_change
from scored

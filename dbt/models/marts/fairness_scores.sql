-- Country-level summary of reciprocity.
--   fairness_score       share of partners treated exactly as they treat us (0-100)
--   reciprocity_balance  (favourable - unfavourable) / partners, from -1 to 1;
--                        positive means our citizens get better access than we give
with agg as (
    select
        snapshot_date,
        country_iso3,
        count(*)                                           as n_partners,
        count(*) filter (where relation = 'symmetric')     as n_symmetric,
        count(*) filter (where relation = 'favorable')     as n_favorable,
        count(*) filter (where relation = 'unfavorable')   as n_unfavorable
    from {{ ref('reciprocity') }}
    group by all
)

select
    *,
    round(100.0 * n_symmetric / n_partners, 1)                        as fairness_score,
    round((n_favorable - n_unfavorable) / n_partners, 3)              as reciprocity_balance,
    round(100.0 * (n_favorable + n_unfavorable) / n_partners, 1)      as asymmetric_share,
    rank() over (partition by snapshot_date order by n_symmetric desc) as fairness_rank
from agg

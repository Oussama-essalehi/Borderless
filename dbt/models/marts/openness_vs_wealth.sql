-- Latest snapshot: passport strength and openness next to GDP per capita and
-- HDI (most recent value up to the snapshot year), with least-squares fits so
-- outliers can be read straight from the residuals.
with latest as (
    select snapshot_date, year(snapshot_date) as snapshot_year
    from {{ ref('int_snapshots') }}
    where is_latest
),

scores as (
    select p.passport_iso3 as iso3, p.visa_free_score, p.world_rank
    from {{ ref('passport_scores') }} p
    join latest using (snapshot_date)
),

openness as (
    -- How many passports can enter without advance application (in-degree).
    select m.destination_iso3 as iso3, count(*) filter (where m.no_advance_application) as openness_score
    from {{ ref('int_visa_matrix') }} m
    join latest using (snapshot_date)
    where m.category <> 'home'
    group by all
),

gdp as (
    select g.iso3, arg_max(g.gdp_per_capita_usd, g.year) as gdp_per_capita_usd, max(g.year) as gdp_year
    from {{ ref('stg_worldbank__gdp_per_capita') }} g, latest
    where g.year <= latest.snapshot_year
    group by g.iso3
),

hdi as (
    select h.iso3, arg_max(h.hdi, h.year) as hdi, max(h.year) as hdi_year
    from {{ ref('stg_undp__hdi') }} h, latest
    where h.year <= latest.snapshot_year
    group by h.iso3
),

joined as (
    select
        latest.snapshot_date,
        s.iso3,
        s.visa_free_score,
        s.world_rank,
        o.openness_score,
        gdp.gdp_per_capita_usd,
        gdp.gdp_year,
        log10(gdp.gdp_per_capita_usd) as log10_gdp_per_capita,
        hdi.hdi,
        hdi.hdi_year
    from scores s
    cross join latest
    left join openness o using (iso3)
    left join gdp using (iso3)
    left join hdi using (iso3)
),

fit as (
    select
        corr(visa_free_score, log10_gdp_per_capita)            as r_score_log_gdp,
        regr_slope(visa_free_score, log10_gdp_per_capita)      as slope_log_gdp,
        regr_intercept(visa_free_score, log10_gdp_per_capita)  as intercept_log_gdp,
        regr_count(visa_free_score, log10_gdp_per_capita)      as n_gdp,
        corr(visa_free_score, hdi)                             as r_score_hdi,
        regr_slope(visa_free_score, hdi)                       as slope_hdi,
        regr_intercept(visa_free_score, hdi)                   as intercept_hdi,
        regr_count(visa_free_score, hdi)                       as n_hdi
    from joined
)

select
    j.*,
    f.r_score_log_gdp,
    f.n_gdp,
    f.r_score_hdi,
    f.n_hdi,
    f.intercept_log_gdp + f.slope_log_gdp * j.log10_gdp_per_capita              as expected_score_from_gdp,
    j.visa_free_score - (f.intercept_log_gdp + f.slope_log_gdp * j.log10_gdp_per_capita) as residual_gdp,
    f.intercept_hdi + f.slope_hdi * j.hdi                                       as expected_score_from_hdi,
    j.visa_free_score - (f.intercept_hdi + f.slope_hdi * j.hdi)                 as residual_hdi
from joined j
cross join fit f

-- One row per canonical ISO-3 code seen in any source, with the Natural Earth
-- feature it is drawn with and which sources cover it. Natural Earth features
-- without a usable code (e.g. N. Cyprus, Somaliland, Siachen Glacier) get no
-- row here and are shown as "no data" on the map.
with ne as (
    select
        n.*,
        coalesce(o.iso3, n.iso_a3) as iso3
    from {{ ref('stg_natural_earth__countries') }} n
    left join {{ ref('country_overrides') }} o using (ne_adm0_a3)
),

visa as (
    select passport_iso3 as iso3 from {{ ref('stg_visa__requirements') }}
    union
    select destination_iso3 from {{ ref('stg_visa__requirements') }}
),

codes as (
    select iso3 from visa
    union select iso3 from ne where iso3 is not null
)

select
    codes.iso3,
    ne.ne_adm0_a3,
    codes.iso3 in (select iso3 from visa)                                                as in_visa_data,
    ne.ne_adm0_a3 is not null                                                            as in_natural_earth,
    codes.iso3 in (select iso3 from {{ ref('stg_worldbank__countries') }})               as in_worldbank,
    codes.iso3 in (select iso3 from {{ ref('stg_undp__hdi') }})                          as in_hdi
from codes
left join ne on ne.iso3 = codes.iso3

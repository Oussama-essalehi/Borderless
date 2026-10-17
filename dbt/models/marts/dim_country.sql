-- Country dimension: one row per ISO-3 code, with display name, region,
-- economic context and membership flags.
with mapping as (
    select * from {{ ref('int_country_mapping') }}
),

ne as (
    select * from {{ ref('stg_natural_earth__countries') }}
),

wb as (
    select * from {{ ref('stg_worldbank__countries') }}
),

overrides as (
    select * from {{ ref('country_attribute_overrides') }}
),

blocs as (
    select iso3, list(bloc_code order by bloc_code) as blocs
    from {{ ref('regional_blocs') }}
    group by iso3
)

select
    m.iso3,
    coalesce(o.display_name, ne.ne_name, wb.name, m.iso3)       as name,
    coalesce(o.display_name_fr, ne.ne_name_fr, o.display_name, ne.ne_name, wb.name, m.iso3) as name_fr,
    coalesce(ne.ne_name_long, wb.name)                          as name_long,
    ne.region_un                                                as region,
    coalesce(o.subregion, ne.subregion)                         as subregion,
    ne.continent,
    wb.wb_region,
    wb.income_level,
    ne.ne_type,
    ne.sovereign,
    ne.label_lon,
    ne.label_lat,
    m.ne_adm0_a3,
    m.in_visa_data,
    m.in_natural_earth,
    m.in_worldbank,
    m.in_hdi,
    s.iso3 is not null                                          as is_schengen,
    s.full_member_since                                         as schengen_since,
    coalesce(b.blocs, [])                                       as blocs
from mapping m
left join ne using (ne_adm0_a3)
left join wb on wb.iso3 = m.iso3
left join overrides o on o.iso3 = m.iso3
left join {{ ref('schengen_area') }} s on s.iso3 = m.iso3
left join blocs b on b.iso3 = m.iso3

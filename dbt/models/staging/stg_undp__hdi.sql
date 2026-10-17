-- Wide hdi_1990 ... hdi_YYYY columns become (iso3, year, hdi). Regional and
-- development-group aggregates (iso3 starting with ZZ) are dropped.
with long as (
    unpivot (
        select iso3, country, columns('^hdi_\d{4}$')
        from {{ source('raw', 'undp_hdi') }}
    )
    on columns('^hdi_\d{4}$')
    into name year_column value hdi_text
)

select
    upper(iso3)                                   as iso3,
    country                                       as hdi_country_name,
    cast(right(year_column, 4) as integer)        as year,
    try_cast(hdi_text as double)                  as hdi
from long
where iso3 not like 'ZZ%'
  and try_cast(hdi_text as double) is not null

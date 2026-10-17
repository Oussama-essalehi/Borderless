select
    upper(iso3)          as iso3,
    year,
    gdp_per_capita_usd
from {{ source('raw', 'worldbank_gdp_per_capita') }}
where gdp_per_capita_usd > 0

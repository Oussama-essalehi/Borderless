select
    upper(iso3)   as iso3,
    name,
    region        as wb_region,
    income_level
from {{ source('raw', 'worldbank_countries') }}

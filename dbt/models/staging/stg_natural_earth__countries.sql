select
    adm0_a3                         as ne_adm0_a3,
    nullif(iso_a3, '-99')           as iso_a3,
    nullif(iso_a3_eh, '-99')        as iso_a3_eh,
    name                            as ne_name,
    name_long                       as ne_name_long,
    name_fr                         as ne_name_fr,
    admin                           as ne_admin,
    sovereignt                      as sovereign,
    type                            as ne_type,
    continent,
    region_un,
    subregion,
    region_wb,
    cast(label_x as double)         as label_lon,
    cast(label_y as double)         as label_lat,
    cast(pop_est as bigint)         as population_estimate
from {{ source('raw', 'natural_earth_countries') }}

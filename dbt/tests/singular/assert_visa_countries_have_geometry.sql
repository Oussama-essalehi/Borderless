-- Every passport in the visa data can be drawn on the map.
select iso3
from {{ ref('dim_country') }}
where in_visa_data and not in_natural_earth

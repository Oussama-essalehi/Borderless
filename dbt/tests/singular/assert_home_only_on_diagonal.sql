select *
from {{ ref('int_visa_matrix') }}
where (category = 'home') <> (passport_iso3 = destination_iso3)

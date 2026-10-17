-- A new label in a future snapshot must be added to the requirement_mapping seed.
select snapshot_date, requirement_raw, count(*) as n
from {{ ref('int_visa_matrix') }}
where category is null
group by all

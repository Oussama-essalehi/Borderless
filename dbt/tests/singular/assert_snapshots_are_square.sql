-- Every snapshot has one row per passport x destination, including home rows.
select snapshot_date, count(*) as n, count(distinct passport_iso3) as passports
from {{ ref('int_visa_matrix') }}
group by snapshot_date
having count(*) <> count(distinct passport_iso3) * count(distinct destination_iso3)
    or count(distinct passport_iso3) <> count(distinct destination_iso3)

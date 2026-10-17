-- Latest snapshot: destinations each passport can visit without applying in
-- advance (visa-free or visa on arrival), with region and allowed stay.
select
    m.snapshot_date,
    m.passport_iso3,
    m.destination_iso3,
    d.name               as destination_name,
    d.region,
    d.subregion,
    m.category,
    m.visa_free_days,
    d.is_schengen        as destination_is_schengen,
    row_number() over (
        partition by m.passport_iso3, d.region
        order by m.visa_free_days desc nulls last, d.name
    )                    as stay_rank_in_region
from {{ ref('int_visa_matrix') }} m
join {{ ref('int_snapshots') }} s using (snapshot_date)
join {{ ref('dim_country') }} d on d.iso3 = m.destination_iso3
where s.is_latest
  and m.no_advance_application

{{ config(materialized='view') }}
-- Public-facing matrix used by the export and the network analysis.
select
    snapshot_date,
    passport_iso3,
    destination_iso3,
    category,
    category_detail,
    visa_free_days,
    ease_rank,
    access_tier,
    no_advance_application
from {{ ref('int_visa_matrix') }}

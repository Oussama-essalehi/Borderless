-- Pair-level reciprocity. For country A and partner B:
--   outbound = what A's citizens get when visiting B
--   inbound  = what B's citizens get when visiting A
-- Compared on access tiers (4 visa-free/on arrival, 3 ETA, 2 e-visa, 1 visa
-- required/no admission): equal tiers are symmetric; a better outbound tier
-- is favourable to A, a worse one unfavourable.
select
    o.snapshot_date,
    o.passport_iso3              as country_iso3,
    o.destination_iso3           as partner_iso3,
    o.category                   as outbound_category,
    i.category                   as inbound_category,
    o.access_tier                as outbound_tier,
    i.access_tier                as inbound_tier,
    case
        when o.access_tier = i.access_tier then 'symmetric'
        when o.access_tier > i.access_tier then 'favorable'
        else 'unfavorable'
    end                          as relation,
    o.access_tier - i.access_tier as tier_gap
from {{ ref('int_visa_matrix') }} o
join {{ ref('int_visa_matrix') }} i
    on i.snapshot_date = o.snapshot_date
   and i.passport_iso3 = o.destination_iso3
   and i.destination_iso3 = o.passport_iso3
where o.category <> 'home'

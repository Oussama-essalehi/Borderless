-- If A is favoured by B, B must be disfavoured by A, and symmetric pairs stay symmetric.
select a.snapshot_date, a.country_iso3, a.partner_iso3, a.relation, b.relation as mirrored
from {{ ref('reciprocity') }} a
join {{ ref('reciprocity') }} b
  on b.snapshot_date = a.snapshot_date
 and b.country_iso3 = a.partner_iso3
 and b.partner_iso3 = a.country_iso3
where (a.relation = 'symmetric' and b.relation <> 'symmetric')
   or (a.relation = 'favorable' and b.relation <> 'unfavorable')
   or (a.relation = 'unfavorable' and b.relation <> 'favorable')

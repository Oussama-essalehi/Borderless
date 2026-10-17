-- The 2019 numeric codes are mapped by matching them against the first
-- labelled snapshot. If the mapping were wrong, thousands of pairs would
-- "change" category at that boundary; real policy changes are a few hundred.
select snapshot_date, count(*) as category_flips
from {{ ref('snapshot_changes') }}
where previous_category <> category
  and snapshot_date = (
      select min(snapshot_date) from {{ ref('int_snapshots') }}
      where previous_value_format = 'numeric_code' and value_format <> 'numeric_code'
  )
group by snapshot_date
having count(*) > 1000

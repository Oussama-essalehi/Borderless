-- In November 2020 the source split one mixed bucket into visa on arrival,
-- e-visa and ETA. Thousands of pairs moved between those categories at that
-- boundary; they must be flagged as methodology artefacts. What remains
-- (COVID-19 bans aside) should be a few hundred genuine changes.
select snapshot_date, count(*) as unflagged_changes
from {{ ref('snapshot_changes') }}
where previous_category <> category
  and not is_methodology_artifact
  and 'no_admission' not in (category, previous_category)
  and snapshot_date = (
      select min(snapshot_date) from {{ ref('int_snapshots') }}
      where previous_value_format = 'short_code' and value_format = 'label'
  )
group by snapshot_date
having count(*) > 1000

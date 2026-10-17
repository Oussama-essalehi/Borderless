import type { App } from "../app";
import { CATEGORY_LABEL, escapeHtml, swatch } from "../format";
import { pairRelation } from "../reciprocity";
import { fairnessFor, relationColor } from "../views/reciprocity";

/** Reciprocity section of the passport tab, plus the fairness ranking. */
export function reciprocityPanel(app: App): string {
  const { passport } = app.store.state;
  const matrix = app.matrix!;
  const scores = fairnessFor(app);
  const ranked = [...scores.values()].sort((a, b) => a.rank - b.rank || app.data.name(a.iso3).localeCompare(app.data.name(b.iso3)));
  const row = (f: (typeof ranked)[number]) => `<tr class="${f.iso3 === passport ? "is-selected" : ""}">
      <td class="num">${f.rank}</td>
      <td><button type="button" class="linklike" data-iso="${f.iso3}">${escapeHtml(app.data.name(f.iso3))}</button></td>
      <td class="num">${f.fairness.toFixed(1)}%</td>
      <td class="num">${f.balance > 0 ? "+" : ""}${f.balance.toFixed(2)}</td></tr>`;
  const table = (rows: typeof ranked) => `<table class="ranking">
      <thead><tr><th class="num">#</th><th>Country</th><th class="num" title="Share of symmetric relationships">Fair</th><th class="num" title="(favourable − unfavourable) / partners">Balance</th></tr></thead>
      <tbody>${rows.map(row).join("")}</tbody></table>`;

  let selected = "";
  if (passport && scores.has(passport)) {
    const f = scores.get(passport)!;
    const name = escapeHtml(app.data.name(passport));
    const unfavourable = matrix.codes
      .map((d) => ({ d, pair: pairRelation(matrix, passport, d) }))
      .filter((x) => x.pair?.relation === "unfavorable")
      .sort((a, b) => a.pair!.out!.category.localeCompare(b.pair!.out!.category) || app.data.name(a.d).localeCompare(app.data.name(b.d)));
    selected = `
      <div class="hero">
        <div><div class="figure">${f.fairness.toFixed(0)}%</div><div class="label">symmetric relationships</div></div>
        <div><div class="figure">${f.rank}</div><div class="label">fairness rank of ${scores.size}</div></div>
      </div>
      <ul class="counts">
        <li>${swatch(relationColor("favorable"))}<span>Favourable to ${name}</span><span class="num">${f.favorable}</span></li>
        <li>${swatch(relationColor("symmetric"))}<span>Symmetric</span><span class="num">${f.symmetric}</span></li>
        <li>${swatch(relationColor("unfavorable"))}<span>Unfavourable to ${name}</span><span class="num">${f.unfavorable}</span></li>
      </ul>
      ${unfavourable.length ? `<details><summary>Where ${name} gives more than it gets (${unfavourable.length})</summary>
        <ul class="dest-list" style="columns:1">${unfavourable
          .map(({ d, pair }) => `<li><button type="button" data-focus="${d}">${escapeHtml(app.data.name(d))}</button>
            <span class="subtle">${escapeHtml(CATEGORY_LABEL[pair!.out!.category])} for ${name} · ${escapeHtml(CATEGORY_LABEL[pair!.back!.category])} in return</span></li>`)
          .join("")}</ul></details>` : ""}`;
  }

  return `
    <h3>Reciprocity</h3>
    <p class="subtle">Each relationship compares what ${passport ? escapeHtml(app.data.name(passport)) : "a country"}'s citizens get abroad with what
      that country gives back, on four tiers: visa-free or on arrival, ETA, e-visa, visa required.</p>
    ${selected}
    <h3>Most reciprocal</h3>${table(ranked.slice(0, 8))}
    <h3>Least reciprocal</h3>${table(ranked.slice(-8))}
    <p class="subtle">A negative balance means a country lets in more people visa-free than it gets in return —
      often small tourism economies that open up unilaterally.</p>`;
}

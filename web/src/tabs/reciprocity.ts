import type { App } from "../app";
import { categoryLabel, escapeHtml, swatch } from "../format";
import { formatNumber, percent, t } from "../i18n";
import { pairRelation } from "../reciprocity";
import { fairnessFor, relationColor } from "../views/reciprocity";

/** Reciprocity section of the passport tab, plus the fairness ranking. */
export function reciprocityPanel(app: App): string {
  const { passport } = app.store.state;
  const matrix = app.matrix!;
  const scores = fairnessFor(app);
  const ranked = [...scores.values()].sort((a, b) => a.rank - b.rank || app.data.byName(a.iso3, b.iso3));
  const row = (f: (typeof ranked)[number]) => `<tr class="${f.iso3 === passport ? "is-selected" : ""}">
      <td class="num">${f.rank}</td>
      <td><button type="button" class="linklike" data-iso="${f.iso3}">${escapeHtml(app.data.name(f.iso3))}</button></td>
      <td class="num">${percent(f.fairness, 1)}</td>
      <td class="num">${f.balance > 0 ? "+" : ""}${formatNumber(f.balance, 2)}</td></tr>`;
  const table = (rows: typeof ranked) => `<table class="ranking">
      <thead><tr><th class="num">#</th><th>${escapeHtml(t("recip.country"))}</th>
        <th class="num" title="${escapeHtml(t("recip.fairTitle"))}">${escapeHtml(t("recip.fair"))}</th>
        <th class="num" title="${escapeHtml(t("recip.balanceTitle"))}">${escapeHtml(t("recip.balance"))}</th></tr></thead>
      <tbody>${rows.map(row).join("")}</tbody></table>`;

  let selected = "";
  if (passport && scores.has(passport)) {
    const f = scores.get(passport)!;
    const name = app.data.name(passport);
    const unfavourable = matrix.codes
      .map((d) => ({ d, pair: pairRelation(matrix, passport, d) }))
      .filter((x) => x.pair?.relation === "unfavorable")
      .sort((a, b) => a.pair!.out!.category.localeCompare(b.pair!.out!.category) || app.data.byName(a.d, b.d));
    selected = `
      <div class="hero">
        <div><div class="figure">${percent(f.fairness)}</div><div class="label">${escapeHtml(t("recip.symmetricShare"))}</div></div>
        <div><div class="figure">${f.rank}</div><div class="label">${escapeHtml(t("recip.fairnessRank", { of: scores.size }))}</div></div>
      </div>
      <ul class="counts">
        <li>${swatch(relationColor("favorable"))}<span>${escapeHtml(t("legend.favourableTo", { name }))}</span><span class="num">${f.favorable}</span></li>
        <li>${swatch(relationColor("symmetric"))}<span>${escapeHtml(t("legend.symmetric"))}</span><span class="num">${f.symmetric}</span></li>
        <li>${swatch(relationColor("unfavorable"))}<span>${escapeHtml(t("legend.unfavourableTo", { name }))}</span><span class="num">${f.unfavorable}</span></li>
      </ul>
      ${unfavourable.length ? `<details><summary>${escapeHtml(t("recip.givesMore", { name, n: unfavourable.length }))}</summary>
        <ul class="dest-list" style="columns:1">${unfavourable
          .map(({ d, pair }) => `<li><button type="button" data-focus="${d}">${escapeHtml(app.data.name(d))}</button>
            <span class="subtle">${escapeHtml(t("recip.inReturn", { out: categoryLabel(pair!.out!.category), name, back: categoryLabel(pair!.back!.category) }))}</span></li>`)
          .join("")}</ul></details>` : ""}`;
  }

  return `
    <h3>${escapeHtml(t("recip.title"))}</h3>
    <p class="subtle">${escapeHtml(t("recip.explain", { name: passport ? app.data.name(passport) : t("recip.aCountry") }))}</p>
    ${selected}
    <h3>${escapeHtml(t("recip.most"))}</h3>${table(ranked.slice(0, 8))}
    <h3>${escapeHtml(t("recip.least"))}</h3>${table(ranked.slice(-8))}
    <p class="subtle">${escapeHtml(t("recip.balanceNote"))}</p>`;
}

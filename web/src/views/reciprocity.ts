import { scoreRamp, type App, type ViewDef } from "../app";
import { categoryLabel, describeAccess, escapeHtml, swatch } from "../format";
import { percent, t } from "../i18n";
import { renderLegend, rampLegend } from "../legend";
import { fairnessScores, pairRelation, type Fairness } from "../reciprocity";
import { cssVar } from "../theme";
import type { Matrix, Relation } from "../matrix";

const cache = new WeakMap<Matrix, Map<string, Fairness>>();

export function fairnessFor(app: App): Map<string, Fairness> {
  const matrix = app.matrix!;
  if (!cache.has(matrix)) cache.set(matrix, new Map(fairnessScores(matrix).map((f) => [f.iso3, f])));
  return cache.get(matrix)!;
}

function fairnessRange(app: App): [number, number] {
  const values = [...fairnessFor(app).values()].map((f) => f.fairness);
  return [Math.min(...values), Math.max(...values)];
}

export function relationLabel(rel: Relation): string {
  return t(rel === "favorable" ? "recip.favourable" : rel === "symmetric" ? "recip.symmetric" : "recip.unfavourable");
}

export function relationColor(rel: Relation): string {
  return cssVar(`--r-${rel}`);
}

export const reciprocityView: ViewDef = {
  id: "reciprocity",
  label: () => t("view.reciprocity"),
  color(app, iso3) {
    const { passport } = app.store.state;
    const matrix = app.matrix;
    if (!matrix?.has(iso3)) return null;
    if (!passport) {
      const f = fairnessFor(app).get(iso3);
      if (!f) return null;
      const [lo, hi] = fairnessRange(app);
      const ramp = scoreRamp();
      const share = hi > lo ? (f.fairness - lo) / (hi - lo) : 0;
      return ramp[Math.min(ramp.length - 1, Math.floor(share * ramp.length))];
    }
    if (iso3 === passport) return cssVar("--c-home");
    const pair = pairRelation(matrix, passport, iso3);
    return pair ? relationColor(pair.relation) : null;
  },
  tooltip(app, iso3) {
    const { passport } = app.store.state;
    const name = app.data.name(iso3);
    if (!passport) {
      const f = fairnessFor(app).get(iso3);
      return `<strong>${escapeHtml(name)}</strong>${escapeHtml(t("recip.tipFairness", { score: f ? percent(f.fairness, 1) : "–" }))}
        <div class="hint">${f ? escapeHtml(t("recip.tipShare", { symmetric: f.symmetric, partners: f.partners })) : ""}</div>`;
    }
    if (iso3 === passport) return `<strong>${escapeHtml(name)}</strong>${escapeHtml(t("legend.selected"))}`;
    const pair = pairRelation(app.matrix!, passport, iso3);
    if (!pair) return `<strong>${escapeHtml(name)}</strong>${escapeHtml(t("common.noData"))}`;
    const home = app.data.name(passport);
    return `<strong>${escapeHtml(name)}</strong>
      <div class="row">${swatch(relationColor(pair.relation))}${escapeHtml(relationLabel(pair.relation))}</div>
      <div class="hint">${escapeHtml(t("recip.tipPair", { from: home, to: name, access: describeAccess(pair.out!) }))}</div>
      <div class="hint">${escapeHtml(t("recip.tipPair", { from: name, to: home, access: categoryLabel(pair.back!.category) }))}</div>`;
  },
  legend(app, el) {
    const { passport } = app.store.state;
    if (!passport) {
      const [lo, hi] = fairnessRange(app);
      rampLegend(el, t("legend.fairness"), scoreRamp(), percent(lo), percent(hi));
      return;
    }
    const name = app.data.name(passport);
    renderLegend(el, t("legend.reciprocityFor", { name }), [
      { color: relationColor("favorable"), label: t("legend.favourableTo", { name }) },
      { color: relationColor("symmetric"), label: t("legend.symmetric") },
      { color: relationColor("unfavorable"), label: t("legend.unfavourableTo", { name }) },
      { color: cssVar("--c-home"), label: t("legend.selected") },
    ]);
  },
};

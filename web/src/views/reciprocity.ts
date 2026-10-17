import { scoreRamp, type App, type ViewDef } from "../app";
import { CATEGORY_LABEL, describeAccess, escapeHtml, swatch } from "../format";
import { renderLegend, rampLegend } from "../legend";
import { fairnessScores, pairRelation, type Fairness } from "../reciprocity";
import { cssVar } from "../theme";
import type { Matrix } from "../matrix";

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

export const RELATION_LABEL = {
  favorable: "Favourable: you get better access than you give",
  symmetric: "Symmetric: same access both ways",
  unfavorable: "Unfavourable: you give better access than you get",
} as const;

export function relationColor(rel: keyof typeof RELATION_LABEL): string {
  return cssVar(`--r-${rel}`);
}

export const reciprocityView: ViewDef = {
  id: "reciprocity",
  label: "Reciprocity",
  color(app, iso3) {
    const { passport } = app.store.state;
    const matrix = app.matrix;
    if (!matrix?.has(iso3)) return null;
    if (!passport) {
      const f = fairnessFor(app).get(iso3);
      if (!f) return null;
      const [lo, hi] = fairnessRange(app);
      const ramp = scoreRamp();
      const t = hi > lo ? (f.fairness - lo) / (hi - lo) : 0;
      return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
    }
    if (iso3 === passport) return cssVar("--c-home");
    const pair = pairRelation(matrix, passport, iso3);
    return pair ? relationColor(pair.relation) : null;
  },
  tooltip(app, iso3) {
    const { passport } = app.store.state;
    const name = escapeHtml(app.data.name(iso3));
    if (!passport) {
      const f = fairnessFor(app).get(iso3);
      return `<strong>${name}</strong>Fairness score ${f?.fairness ?? "–"}%
        <div class="hint">${f ? `${f.symmetric} of ${f.partners} relationships are symmetric` : ""}</div>`;
    }
    if (iso3 === passport) return `<strong>${name}</strong>Selected country`;
    const pair = pairRelation(app.matrix!, passport, iso3);
    if (!pair) return `<strong>${name}</strong>No data`;
    const home = escapeHtml(app.data.name(passport));
    return `<strong>${name}</strong>
      <div class="row">${swatch(relationColor(pair.relation))}${escapeHtml(RELATION_LABEL[pair.relation].split(":")[0])}</div>
      <div class="hint">${home} citizens here: ${escapeHtml(describeAccess(pair.out!))}</div>
      <div class="hint">${name} citizens in ${home}: ${escapeHtml(CATEGORY_LABEL[pair.back!.category])}</div>`;
  },
  legend(app, el) {
    const { passport } = app.store.state;
    if (!passport) {
      const [lo, hi] = fairnessRange(app);
      rampLegend(el, "Fairness score: share of symmetric relationships", scoreRamp(), `${lo.toFixed(0)}%`, `${hi.toFixed(0)}%`);
      return;
    }
    renderLegend(el, `Reciprocity for ${app.data.name(passport)}`, [
      { color: relationColor("favorable"), label: "Favourable to " + app.data.name(passport) },
      { color: relationColor("symmetric"), label: "Symmetric" },
      { color: relationColor("unfavorable"), label: "Unfavourable to " + app.data.name(passport) },
      { color: cssVar("--c-home"), label: "Selected country" },
    ]);
  },
};

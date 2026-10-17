import { scoreRamp, type App, type ViewDef } from "../app";
import { accessLegend, rampLegend } from "../legend";
import { categoryColor, describeAccess, DETAIL_LABEL, escapeHtml, swatch, ordinal } from "../format";

function scoreColor(app: App, iso3: string): string | null {
  const score = app.matrix?.has(iso3) ? app.matrix.score(iso3) : null;
  if (score === null) return null;
  const ramp = scoreRamp();
  const max = app.matrix!.codes.length - 1;
  return ramp[Math.min(ramp.length - 1, Math.floor((score / (max + 1)) * ramp.length))];
}

export const accessView: ViewDef = {
  id: "access",
  label: "Access",
  color(app, iso3) {
    const { passport } = app.store.state;
    const matrix = app.matrix;
    if (!matrix?.has(iso3)) return null;
    if (!passport) return scoreColor(app, iso3);
    if (iso3 === passport) return categoryColor("home");
    const access = matrix.get(passport, iso3);
    return access ? categoryColor(access.category) : null;
  },
  tooltip(app, iso3) {
    const { passport, date } = app.store.state;
    const name = escapeHtml(app.data.name(iso3));
    if (!passport) {
      const { score, rank, of } = app.data.rank(iso3, date);
      return `<strong>${name}</strong>Visa-free score ${score ?? "–"}${rank ? ` · ${ordinal(rank)} of ${of}` : ""}<div class="hint">Click to see where this passport goes</div>`;
    }
    if (iso3 === passport) return `<strong>${name}</strong>Selected passport<div class="hint">Press Esc to clear</div>`;
    const access = app.matrix!.get(passport, iso3);
    if (!access) return `<strong>${name}</strong>No data`;
    const lines = [`<div class="row">${swatch(categoryColor(access.category))}${escapeHtml(describeAccess(access))}</div>`];
    if (access.detail && DETAIL_LABEL[access.detail]) lines.push(`<div class="hint">${escapeHtml(DETAIL_LABEL[access.detail])}</div>`);
    const dest = app.data.byIso.get(iso3);
    const home = app.data.byIso.get(passport);
    if (dest?.schengen && !home?.schengen && access.category === "visa_free") {
      lines.push(`<div class="hint">Schengen: days count across the whole area (90 in any 180)</div>`);
    }
    return `<strong>${name}</strong>${lines.join("")}<div class="hint">for ${escapeHtml(app.data.name(passport))} passport holders</div>`;
  },
  legend(app, el) {
    const { passport } = app.store.state;
    if (passport) accessLegend(el, app.data.name(passport));
    else rampLegend(el, "Visa-free score of each passport", scoreRamp(), "fewer destinations", "more");
  },
};

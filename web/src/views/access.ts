import { scoreRamp, type App, type ViewDef } from "../app";
import { accessLegend, rampLegend } from "../legend";
import { categoryColor, describeAccess, detailLabel, escapeHtml, swatch, ordinal } from "../format";
import { t } from "../i18n";

function scoreColor(app: App, iso3: string): string | null {
  const score = app.matrix?.has(iso3) ? app.matrix.score(iso3) : null;
  if (score === null) return null;
  const ramp = scoreRamp();
  const max = app.matrix!.codes.length - 1;
  return ramp[Math.min(ramp.length - 1, Math.floor((score / (max + 1)) * ramp.length))];
}

export const accessView: ViewDef = {
  id: "access",
  label: () => t("view.access"),
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
      const rankText = rank ? ` · ${escapeHtml(t("access.tipRank", { rank: ordinal(rank), of }))}` : "";
      return `<strong>${name}</strong>${escapeHtml(t("access.tipScore", { score: score ?? "–" }))}${rankText}
        <div class="hint">${escapeHtml(t("access.tipClick"))}</div>`;
    }
    if (iso3 === passport) return `<strong>${name}</strong>${escapeHtml(t("access.tipSelected"))}<div class="hint">${escapeHtml(t("access.tipEsc"))}</div>`;
    const access = app.matrix!.get(passport, iso3);
    if (!access) return `<strong>${name}</strong>${escapeHtml(t("common.noData"))}`;
    const lines = [`<div class="row">${swatch(categoryColor(access.category))}${escapeHtml(describeAccess(access))}</div>`];
    const detail = detailLabel(access.detail);
    if (detail) lines.push(`<div class="hint">${escapeHtml(detail)}</div>`);
    const dest = app.data.byIso.get(iso3);
    const home = app.data.byIso.get(passport);
    if (dest?.schengen && !home?.schengen && access.category === "visa_free") {
      lines.push(`<div class="hint">${escapeHtml(t("access.tipSchengen"))}</div>`);
    }
    return `<strong>${name}</strong>${lines.join("")}<div class="hint">${escapeHtml(t("access.tipFor", { name: app.data.name(passport) }))}</div>`;
  },
  legend(app, el) {
    const { passport } = app.store.state;
    if (passport) accessLegend(el, app.data.name(passport));
    else rampLegend(el, t("legend.score"), scoreRamp(), t("legend.fewer"), t("legend.more"));
  },
};

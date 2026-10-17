import type { App, ViewDef } from "../app";
import { CATEGORY_LABEL, categoryColor, describeAccess, escapeHtml, swatch } from "../format";
import { accessLegend, renderLegend } from "../legend";
import { bestOf } from "../matrix";
import { cssVar } from "../theme";
import { accessView } from "./access";

/** When true, only destinations where the second passport does better keep their colour. */
export const comboOptions = { onlyGains: false };

export function comboAccess(app: App, iso3: string) {
  const { passport, second } = app.store.state;
  const m = app.matrix!;
  return bestOf(m.get(passport!, iso3), second ? m.get(second, iso3) : null);
}

export const comboView: ViewDef = {
  id: "combo",
  label: "Two passports",
  color(app, iso3) {
    const { passport, second } = app.store.state;
    if (!passport || !second) return accessView.color(app, iso3);
    if (!app.matrix?.has(iso3)) return null;
    if (iso3 === passport || iso3 === second) return categoryColor("home");
    const { access, from } = comboAccess(app, iso3);
    if (!access) return null;
    if (comboOptions.onlyGains && from !== "second") return cssVar("--hairline");
    return categoryColor(access.category);
  },
  tooltip(app, iso3) {
    const { passport, second } = app.store.state;
    if (!passport || !second) return accessView.tooltip(app, iso3);
    const name = escapeHtml(app.data.name(iso3));
    if (iso3 === passport || iso3 === second) return `<strong>${name}</strong>One of the two passports`;
    const m = app.matrix!;
    const a = m.get(passport, iso3), b = m.get(second, iso3);
    const { access, from } = comboAccess(app, iso3);
    if (!access) return `<strong>${name}</strong>No data`;
    const via = from === "both" ? "either passport" : `the ${escapeHtml(app.data.name(from === "first" ? passport : second))} passport`;
    return `<strong>${name}</strong>
      <div class="row">${swatch(categoryColor(access.category))}${escapeHtml(describeAccess(access))}</div>
      <div class="hint">Best with ${via}</div>
      <div class="hint">${escapeHtml(app.data.name(passport))}: ${a ? escapeHtml(CATEGORY_LABEL[a.category]) : "–"} ·
        ${escapeHtml(app.data.name(second))}: ${b ? escapeHtml(CATEGORY_LABEL[b.category]) : "–"}</div>`;
  },
  legend(app, el) {
    const { passport, second } = app.store.state;
    if (!passport || !second) {
      if (passport) accessLegend(el, app.data.name(passport));
      else renderLegend(el, "Pick two passports", [], { noData: false });
      return;
    }
    accessLegend(el, `${app.data.name(passport)} + ${app.data.name(second)}`);
  },
};

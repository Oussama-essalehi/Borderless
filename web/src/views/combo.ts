import type { App, ViewDef } from "../app";
import { categoryColor, categoryLabel, describeAccess, escapeHtml, swatch } from "../format";
import { colon, t } from "../i18n";
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
  label: () => t("view.combo"),
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
    if (iso3 === passport || iso3 === second) return `<strong>${name}</strong>${escapeHtml(t("combo.tipOneOfTwo"))}`;
    const m = app.matrix!;
    const a = m.get(passport, iso3), b = m.get(second, iso3);
    const { access, from } = comboAccess(app, iso3);
    if (!access) return `<strong>${name}</strong>${escapeHtml(t("common.noData"))}`;
    const via = from === "both" ? t("combo.tipEither") : t("combo.tipThe", { name: app.data.name(from === "first" ? passport : second) });
    return `<strong>${name}</strong>
      <div class="row">${swatch(categoryColor(access.category))}${escapeHtml(describeAccess(access))}</div>
      <div class="hint">${escapeHtml(t("combo.tipBest", { via }))}</div>
      <div class="hint">${escapeHtml(app.data.name(passport))}${colon()}${a ? escapeHtml(categoryLabel(a.category)) : "–"} ·
        ${escapeHtml(app.data.name(second))}${colon()}${b ? escapeHtml(categoryLabel(b.category)) : "–"}</div>`;
  },
  legend(app, el) {
    const { passport, second } = app.store.state;
    if (!passport || !second) {
      if (passport) accessLegend(el, app.data.name(passport));
      else renderLegend(el, t("legend.pickTwo"), [], { noData: false });
      return;
    }
    accessLegend(el, `${app.data.name(passport)} + ${app.data.name(second)}`);
  },
};

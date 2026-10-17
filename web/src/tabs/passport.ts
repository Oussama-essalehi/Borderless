import type { App } from "../app";
import { CATEGORY_ORDER, categoryColor, categoryLabel, escapeHtml, formatDate, ordinal, swatch } from "../format";
import { regionName, t } from "../i18n";
import type { CategoryKey } from "../types";
import { reciprocityPanel } from "./reciprocity";
import { historySection } from "./history";
import { renderComboTab } from "./combo";

export function renderPassportTab(app: App, body: HTMLElement): void {
  const { state } = app.store;
  const matrix = app.matrix;
  if (!matrix) return;
  if (state.view === "combo") {
    renderComboTab(app, body);
    return;
  }

  if (!state.passport) {
    if (state.view === "reciprocity") {
      body.innerHTML = `<h2>${escapeHtml(t("recip.introTitle"))}</h2>
        <p class="empty">${escapeHtml(t("recip.intro"))}</p>${reciprocityPanel(app)}`;
      app.bindCountryLinks(body);
      return;
    }
    const ranking = app.data
      .passports()
      .map((c) => ({ c, ...app.data.rank(c.iso3, state.date) }))
      .filter((r) => r.rank !== null)
      .sort((a, b) => a.rank! - b.rank! || app.data.byName(a.c.iso3, b.c.iso3))
      .slice(0, 15);
    body.innerHTML = `
      <h2>${escapeHtml(t("passport.introTitle"))}</h2>
      <p class="empty">${t("passport.intro")}</p>
      <h3>${escapeHtml(t("passport.strongest", { date: formatDate(state.date) }))}</h3>
      <table class="ranking">
        <thead><tr><th class="num">${escapeHtml(t("passport.rank"))}</th><th>${escapeHtml(t("passport.passport"))}</th><th class="num">${escapeHtml(t("passport.score"))}</th></tr></thead>
        <tbody>${ranking
          .map((r) => `<tr><td class="num">${r.rank}</td><td><button type="button" class="linklike" data-iso="${r.c.iso3}">${escapeHtml(app.data.name(r.c.iso3))}</button></td><td class="num">${r.score}</td></tr>`)
          .join("")}</tbody>
      </table>
      <div class="history"></div>`;
    historySection(app, body.querySelector<HTMLElement>(".history")!);
    app.bindCountryLinks(body);
    return;
  }

  const iso = state.passport;
  const country = app.data.byIso.get(iso);
  const counts = matrix.counts(iso);
  const { score, rank, of } = app.data.rank(iso, state.date);
  const snapshot = app.snapshotInfo;
  const total = CATEGORY_ORDER.reduce((sum, key) => sum + counts[key], 0);

  const destinations: Record<CategoryKey, { iso: string; name: string; days: number | null }[]> = {
    visa_free: [], visa_on_arrival: [], eta: [], e_visa: [], visa_required: [], no_admission: [], home: [],
  };
  for (const dest of matrix.codes) {
    if (dest === iso) continue;
    const access = matrix.get(iso, dest);
    if (access) destinations[access.category].push({ iso: dest, name: app.data.name(dest), days: access.days });
  }
  for (const list of Object.values(destinations)) list.sort((a, b) => app.data.byName(a.iso, b.iso));

  const schengenFree = destinations.visa_free.some((d) => app.data.byIso.get(d.iso)?.schengen);
  const notes: string[] = [];
  if (schengenFree && !country?.schengen) notes.push(t("passport.noteSchengen"));
  if (snapshot && snapshot.value_format !== "label") notes.push(escapeHtml(t("passport.noteMixed")));
  else if (snapshot && !snapshot.eta_is_distinct) notes.push(escapeHtml(t("passport.noteEta")));
  notes.push(escapeHtml(t("passport.noteConditional")));

  const subtitle = [regionName(country?.subregion), country?.schengen ? t("passport.schengenArea") : null].filter(Boolean).join(" · ");
  body.innerHTML = `
    <h2>${escapeHtml(app.data.name(iso))}</h2>
    <div class="subtle">${escapeHtml(subtitle)}</div>
    <div class="hero">
      <div><div class="figure">${score ?? "–"}</div><div class="label">${escapeHtml(t("passport.scoreLabel"))}</div></div>
      <div><div class="figure">${rank ? ordinal(rank) : "–"}</div><div class="label">${escapeHtml(t("passport.rankLabel", { of }))}</div></div>
    </div>
    ${state.view === "reciprocity" ? reciprocityPanel(app) : ""}
    <div class="history"></div>
    <h3>${escapeHtml(t("passport.requirements"))}</h3>
    <ul class="counts" aria-label="${escapeHtml(t("passport.requirementsAria"))}">
      ${CATEGORY_ORDER.map((key) => {
        const n = counts[key];
        const pct = total ? (100 * n) / total : 0;
        return `<li>${swatch(categoryColor(key))}<span>${escapeHtml(categoryLabel(key))}</span><span class="num">${n}</span>
          <span class="bar" aria-hidden="true"><span style="width:${pct.toFixed(1)}%;background:${categoryColor(key)}"></span></span></li>`;
      }).join("")}
    </ul>
    ${notes.map((n) => `<p class="note">${n}</p>`).join("")}
    <h3>${escapeHtml(t("passport.destinations"))}</h3>
    ${CATEGORY_ORDER.filter((key) => destinations[key].length)
      .map(
        (key) => `<details${key === "visa_free" ? " open" : ""}>
          <summary>${swatch(categoryColor(key))} ${escapeHtml(categoryLabel(key))} (${destinations[key].length})</summary>
          <ul class="dest-list">${destinations[key]
            .map((d) => `<li><button type="button" data-focus="${d.iso}">${escapeHtml(d.name)}</button>${d.days ? ` <span class="subtle">${escapeHtml(t("common.daysShort", { n: d.days }))}</span>` : ""}</li>`)
            .join("")}</ul>
        </details>`,
      )
      .join("")}`;
  historySection(app, body.querySelector<HTMLElement>(".history")!);
  app.bindCountryLinks(body);
}

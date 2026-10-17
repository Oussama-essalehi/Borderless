import type { App } from "../app";
import { fetchJson } from "../data";
import { categoryColor, categoryLabel, escapeHtml, formatDate, swatch } from "../format";
import { locale, plural, regionName, t } from "../i18n";
import type { CategoryKey } from "../types";

interface TripFile {
  snapshot_date: string;
  passports: Record<string, [string, number, number | null][]>;
}

const CATEGORY_BY_INDEX: CategoryKey[] = ["visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission", "home"];
// Filter values stay in English (the data's own names); only their labels are translated.
let region = "";
let subregion = "";

function flyToRegion(app: App): void {
  const points = app.data.countries
    .filter((c) => c.visa_data && c.lon !== null && c.lat !== null && (!region || c.region === region) && (!subregion || c.subregion === subregion))
    .map((c) => [c.lon!, c.lat!] as [number, number]);
  if (region || subregion) void app.map.flyTo(points);
}

const byLabel = (a: string, b: string) => regionName(a).localeCompare(regionName(b), locale());

/** Destinations reachable without any advance application, by region, longest stay first. */
export async function renderTripsTab(app: App, body: HTMLElement): Promise<void> {
  const { passport, date } = app.store.state;
  const regions = [...new Set(app.data.countries.filter((c) => c.visa_data && c.region).map((c) => c.region!))].sort(byLabel);
  const subregions = [...new Set(app.data.countries
    .filter((c) => c.visa_data && c.subregion && (!region || c.region === region))
    .map((c) => c.subregion!))].sort(byLabel);
  if (subregion && !subregions.includes(subregion)) subregion = "";

  const passportOptions = app.data.passports()
    .map((c) => `<option value="${c.iso3}"${c.iso3 === passport ? " selected" : ""}>${escapeHtml(app.data.name(c.iso3))}</option>`).join("");
  const regionOptions = regions.map((r) => `<option value="${escapeHtml(r)}"${r === region ? " selected" : ""}>${escapeHtml(regionName(r))}</option>`).join("");
  const subOptions = subregions.map((r) => `<option value="${escapeHtml(r)}"${r === subregion ? " selected" : ""}>${escapeHtml(regionName(r))}</option>`).join("");

  let results = "";
  if (passport) {
    // The trip_planner mart covers the latest snapshot; older snapshots use the same rule on their matrix.
    let trips: { iso: string; category: CategoryKey; days: number | null }[];
    if (date === app.data.latestDate) {
      const file = await fetchJson<TripFile>("trip_planner.json");
      trips = (file.passports[passport] ?? []).map(([iso, cat, days]) => ({ iso, category: CATEGORY_BY_INDEX[cat - 1], days }));
    } else {
      const m = app.matrix!;
      trips = m.codes
        .filter((d) => d !== passport)
        .map((d) => ({ iso: d, access: m.get(passport, d)! }))
        .filter((x) => x.access && (x.access.category === "visa_free" || x.access.category === "visa_on_arrival"))
        .map((x) => ({ iso: x.iso, category: x.access.category, days: x.access.days }));
    }
    // Longest stay first, then by name in the current language.
    trips.sort((a, b) => (b.days ?? -1) - (a.days ?? -1) || app.data.byName(a.iso, b.iso));
    const filtered = trips.filter((x) => {
      const c = app.data.byIso.get(x.iso);
      return (!region || c?.region === region) && (!subregion || c?.subregion === subregion);
    });
    const anySchengen = filtered.some((x) => app.data.byIso.get(x.iso)?.schengen) && !app.data.byIso.get(passport)?.schengen;
    const where = regionName(subregion || region) || t("trips.world");
    results = `
      <p>${t("trips.count", {
        n: filtered.length,
        s: plural(filtered.length),
        where: escapeHtml(where),
        name: escapeHtml(app.data.name(passport)),
        when: date !== app.data.latestDate ? ` (${escapeHtml(formatDate(date))})` : "",
      })}</p>
      ${anySchengen ? `<p class="note">${t("trips.schengen")}</p>` : ""}
      <table class="ranking">
        <thead><tr><th>${escapeHtml(t("trips.destination"))}</th><th>${escapeHtml(t("trips.entry"))}</th><th class="num">${escapeHtml(t("trips.stay"))}</th></tr></thead>
        <tbody>${filtered
          .map((x) => `<tr><td><button type="button" class="linklike" data-focus="${x.iso}">${escapeHtml(app.data.name(x.iso))}</button>
            <span class="subtle">${escapeHtml(regionName(app.data.byIso.get(x.iso)?.subregion))}</span></td>
            <td>${swatch(categoryColor(x.category))} ${escapeHtml(categoryLabel(x.category))}</td>
            <td class="num">${x.days ? escapeHtml(t("common.days", { n: x.days })) : `<span class="subtle">${escapeHtml(t("common.notStated"))}</span>`}</td></tr>`)
          .join("") || `<tr><td colspan="3" class="subtle">${escapeHtml(t("trips.nothing"))}</td></tr>`}</tbody>
      </table>
      <p class="subtle">${escapeHtml(t("trips.note"))}</p>`;
  }

  body.innerHTML = `
    <h2>${escapeHtml(t("trips.title"))}</h2>
    <p class="subtle">${escapeHtml(t("trips.intro"))}</p>
    <div class="field"><label for="trip-passport">${escapeHtml(t("trips.passport"))}</label>
      <select id="trip-passport"><option value="">${escapeHtml(t("common.choose"))}</option>${passportOptions}</select></div>
    <div class="field"><label for="trip-region">${escapeHtml(t("trips.region"))}</label>
      <select id="trip-region"><option value="">${escapeHtml(t("trips.allRegions"))}</option>${regionOptions}</select></div>
    <div class="field"><label for="trip-subregion">${escapeHtml(t("trips.subregion"))}</label>
      <select id="trip-subregion"><option value="">${escapeHtml(t("trips.allSubregions"))}</option>${subOptions}</select></div>
    ${results}`;

  body.querySelector<HTMLSelectElement>("#trip-passport")!.addEventListener("change", (e) =>
    app.store.set({ passport: (e.target as HTMLSelectElement).value || null }));
  body.querySelector<HTMLSelectElement>("#trip-region")!.addEventListener("change", (e) => {
    region = (e.target as HTMLSelectElement).value;
    subregion = "";
    flyToRegion(app);
    void renderTripsTab(app, body).then(() => body.querySelector<HTMLSelectElement>("#trip-region")!.focus());
  });
  body.querySelector<HTMLSelectElement>("#trip-subregion")!.addEventListener("change", (e) => {
    subregion = (e.target as HTMLSelectElement).value;
    flyToRegion(app);
    void renderTripsTab(app, body).then(() => body.querySelector<HTMLSelectElement>("#trip-subregion")!.focus());
  });
  app.bindCountryLinks(body);
}

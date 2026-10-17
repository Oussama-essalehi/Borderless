import type { App } from "../app";
import { fetchJson } from "../data";
import { CATEGORY_LABEL, categoryColor, escapeHtml, formatDate, swatch } from "../format";
import type { CategoryKey } from "../types";

interface TripFile {
  snapshot_date: string;
  passports: Record<string, [string, number, number | null][]>;
}

const CATEGORY_BY_INDEX: CategoryKey[] = ["visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission", "home"];
let region = "";
let subregion = "";

function flyToRegion(app: App): void {
  const points = app.data.countries
    .filter((c) => c.visa_data && c.lon !== null && c.lat !== null && (!region || c.region === region) && (!subregion || c.subregion === subregion))
    .map((c) => [c.lon!, c.lat!] as [number, number]);
  if (region || subregion) void app.map.flyTo(points);
}

/** Destinations reachable without any advance application, by region, longest stay first. */
export async function renderTripsTab(app: App, body: HTMLElement): Promise<void> {
  const { passport, date } = app.store.state;
  const regions = [...new Set(app.data.countries.filter((c) => c.visa_data && c.region).map((c) => c.region!))].sort();
  const subregions = [...new Set(app.data.countries
    .filter((c) => c.visa_data && c.subregion && (!region || c.region === region))
    .map((c) => c.subregion!))].sort();
  if (subregion && !subregions.includes(subregion)) subregion = "";

  const passportOptions = app.data.passports()
    .map((c) => `<option value="${c.iso3}"${c.iso3 === passport ? " selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
  const regionOptions = regions.map((r) => `<option${r === region ? " selected" : ""}>${escapeHtml(r)}</option>`).join("");
  const subOptions = subregions.map((r) => `<option${r === subregion ? " selected" : ""}>${escapeHtml(r)}</option>`).join("");

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
        .filter((t) => t.access && (t.access.category === "visa_free" || t.access.category === "visa_on_arrival"))
        .map((t) => ({ iso: t.iso, category: t.access.category, days: t.access.days }))
        .sort((a, b) => (b.days ?? -1) - (a.days ?? -1) || app.data.name(a.iso).localeCompare(app.data.name(b.iso)));
    }
    const filtered = trips.filter((t) => {
      const c = app.data.byIso.get(t.iso);
      return (!region || c?.region === region) && (!subregion || c?.subregion === subregion);
    });
    const anySchengen = filtered.some((t) => app.data.byIso.get(t.iso)?.schengen) && !app.data.byIso.get(passport)?.schengen;
    const where = subregion || region || "the world";
    results = `
      <p><strong>${filtered.length}</strong> destination${filtered.length === 1 ? "" : "s"} in ${escapeHtml(where)} with no advance application
        for ${escapeHtml(app.data.name(passport))} passport holders${date !== app.data.latestDate ? ` (${escapeHtml(formatDate(date))})` : ""}.</p>
      ${anySchengen ? `<p class="note"><strong>Schengen:</strong> days spent in any Schengen country count towards one shared limit (90 days in any 180).</p>` : ""}
      <table class="ranking">
        <thead><tr><th>Destination</th><th>Entry</th><th class="num">Stay</th></tr></thead>
        <tbody>${filtered
          .map((t) => `<tr><td><button type="button" class="linklike" data-focus="${t.iso}">${escapeHtml(app.data.name(t.iso))}</button>
            <span class="subtle">${escapeHtml(app.data.byIso.get(t.iso)?.subregion ?? "")}</span></td>
            <td>${swatch(categoryColor(t.category))} ${escapeHtml(CATEGORY_LABEL[t.category])}</td>
            <td class="num">${t.days ? `${t.days} days` : "<span class=\"subtle\">not stated</span>"}</td></tr>`)
          .join("") || `<tr><td colspan="3" class="subtle">Nothing in this region without an advance application.</td></tr>`}</tbody>
      </table>
      <p class="subtle">"Not stated" means the source gives no day count (for example freedom of movement, or rules it
        couldn't express as a number). Visas on arrival often carry a fee and their own length of stay.</p>`;
  }

  body.innerHTML = `
    <h2>Trip planner</h2>
    <p class="subtle">Where can you go without applying for anything in advance? Visa-free and visa-on-arrival destinations,
      longest allowed stay first.</p>
    <div class="field"><label for="trip-passport">Passport</label>
      <select id="trip-passport"><option value="">Choose…</option>${passportOptions}</select></div>
    <div class="field"><label for="trip-region">Region</label>
      <select id="trip-region"><option value="">All regions</option>${regionOptions}</select></div>
    <div class="field"><label for="trip-subregion">Subregion</label>
      <select id="trip-subregion"><option value="">All subregions</option>${subOptions}</select></div>
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

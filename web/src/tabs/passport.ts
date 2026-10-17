import type { App } from "../app";
import { CATEGORY_LABEL, CATEGORY_ORDER, categoryColor, escapeHtml, formatDate, ordinal, swatch } from "../format";
import type { CategoryKey } from "../types";

export function renderPassportTab(app: App, body: HTMLElement): void {
  const { state } = app.store;
  const matrix = app.matrix;
  if (!matrix) return;

  if (!state.passport) {
    const ranking = app.data
      .passports()
      .map((c) => ({ c, ...app.data.rank(c.iso3, state.date) }))
      .filter((r) => r.rank !== null)
      .sort((a, b) => a.rank! - b.rank! || a.c.name.localeCompare(b.c.name))
      .slice(0, 15);
    body.innerHTML = `
      <h2>Where can a passport take you?</h2>
      <p class="empty">Click a country on the map or search for it to see where its citizens can travel,
      and how. The map is currently shaded by each passport's <strong>visa-free score</strong>: the number of
      destinations reachable visa-free or with a visa on arrival.</p>
      <h3>Strongest passports · ${escapeHtml(formatDate(state.date))}</h3>
      <table class="ranking">
        <thead><tr><th class="num">Rank</th><th>Passport</th><th class="num">Score</th></tr></thead>
        <tbody>${ranking
          .map((r) => `<tr><td class="num">${r.rank}</td><td><button type="button" class="linklike" data-iso="${r.c.iso3}">${escapeHtml(r.c.name)}</button></td><td class="num">${r.score}</td></tr>`)
          .join("")}</tbody>
      </table>`;
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
  for (const list of Object.values(destinations)) list.sort((a, b) => a.name.localeCompare(b.name));

  const schengenFree = destinations.visa_free.some((d) => app.data.byIso.get(d.iso)?.schengen);
  const notes: string[] = [];
  if (schengenFree && !country?.schengen) {
    notes.push(`<strong>Schengen:</strong> a visa-free stay is counted across the whole Schengen Area
      (usually 90 days in any 180-day period), not per country.`);
  }
  if (snapshot && !snapshot.eta_is_distinct) {
    notes.push(`In this snapshot ETAs are not separated from e-visas; the split starts on 12 January 2025.`);
  }
  notes.push(`Some entries depend on conditions (for example, visa-free with a valid US or Schengen visa,
    or only at certain airports). One category per country can't show that, so treat each colour as the
    general rule.`);

  body.innerHTML = `
    <h2>${escapeHtml(country?.name ?? iso)}</h2>
    <div class="subtle">${escapeHtml([country?.subregion, country?.schengen ? "Schengen Area" : null].filter(Boolean).join(" · "))}</div>
    <div class="hero">
      <div><div class="figure">${score ?? "–"}</div><div class="label">visa-free score</div></div>
      <div><div class="figure">${rank ? ordinal(rank) : "–"}</div><div class="label">world rank of ${of}</div></div>
    </div>
    <ul class="counts" aria-label="Destinations by entry requirement">
      ${CATEGORY_ORDER.map((key) => {
        const n = counts[key];
        const pct = total ? (100 * n) / total : 0;
        return `<li>${swatch(categoryColor(key))}<span>${CATEGORY_LABEL[key]}</span><span class="num">${n}</span>
          <span class="bar" aria-hidden="true"><span style="width:${pct.toFixed(1)}%;background:${categoryColor(key)}"></span></span></li>`;
      }).join("")}
    </ul>
    ${notes.map((n) => `<p class="note">${n}</p>`).join("")}
    <h3>Destinations</h3>
    ${CATEGORY_ORDER.filter((key) => destinations[key].length)
      .map(
        (key) => `<details${key === "visa_free" ? " open" : ""}>
          <summary>${swatch(categoryColor(key))} ${CATEGORY_LABEL[key]} (${destinations[key].length})</summary>
          <ul class="dest-list">${destinations[key]
            .map((d) => `<li><button type="button" data-focus="${d.iso}">${escapeHtml(d.name)}</button>${d.days ? ` <span class="subtle">${d.days}d</span>` : ""}</li>`)
            .join("")}</ul>
        </details>`,
      )
      .join("")}`;
  app.bindCountryLinks(body);
}

import type { App } from "../app";
import { CATEGORY_LABEL, CATEGORY_ORDER, categoryColor, escapeHtml, swatch } from "../format";
import { EASE, bestOf } from "../matrix";
import type { CategoryKey } from "../types";
import { comboOptions } from "../views/combo";

/** Panel for the two-passport view: pick the second passport and see what it adds. */
export function renderComboTab(app: App, body: HTMLElement): void {
  const { passport, second } = app.store.state;
  const m = app.matrix!;
  const options = app.data
    .passports()
    .filter((c) => c.iso3 !== passport)
    .map((c) => `<option value="${c.iso3}"${c.iso3 === second ? " selected" : ""}>${escapeHtml(c.name)}</option>`)
    .join("");

  if (!passport) {
    body.innerHTML = `<h2>Two passports</h2>
      <p class="empty">Dual citizens can use whichever passport works best at each border. Pick a first passport
      on the map or with the search box, then choose the second one here.</p>`;
    return;
  }

  let summary = "";
  if (second) {
    const counts: Record<CategoryKey, number> = { visa_free: 0, visa_on_arrival: 0, eta: 0, e_visa: 0, visa_required: 0, no_admission: 0, home: 0 };
    const gains: { iso: string; from: CategoryKey; to: CategoryKey; days: number | null }[] = [];
    for (const dest of m.codes) {
      if (dest === passport || dest === second) continue;
      const a = m.get(passport, dest);
      const b = m.get(second, dest);
      const { access, from } = bestOf(a, b);
      if (!access) continue;
      counts[access.category]++;
      if (from === "second" && a && b) gains.push({ iso: dest, from: a.category, to: b.category, days: b.days });
    }
    const firstScore = m.score(passport);
    const combined = counts.visa_free + counts.visa_on_arrival;
    const newlyFree = gains.filter((g) => EASE[g.to] >= EASE.visa_on_arrival && EASE[g.from] < EASE.visa_on_arrival);
    gains.sort((x, y) => EASE[y.to] - EASE[y.from] - (EASE[x.to] - EASE[x.from]) || app.data.name(x.iso).localeCompare(app.data.name(y.iso)));
    const n1 = escapeHtml(app.data.name(passport)), n2 = escapeHtml(app.data.name(second));
    summary = `
      <div class="hero">
        <div><div class="figure">+${combined - firstScore}</div><div class="label">visa-free destinations added by ${n2}</div></div>
        <div><div class="figure">${combined}</div><div class="label">combined visa-free score</div></div>
      </div>
      <p>${n2} improves access to <strong>${gains.length}</strong> destinations compared with ${n1} alone, and opens
        <strong>${newlyFree.length}</strong> of them without an advance application.</p>
      <label class="check"><input type="checkbox" id="only-gains"${comboOptions.onlyGains ? " checked" : ""}/> Only colour destinations where ${n2} does better</label>
      <h3>Best access with either passport</h3>
      <ul class="counts">${CATEGORY_ORDER.map((k) => `<li>${swatch(categoryColor(k))}<span>${CATEGORY_LABEL[k]}</span><span class="num">${counts[k]}</span></li>`).join("")}</ul>
      ${gains.length ? `<h3>What ${n2} adds</h3>
        <ul class="dest-list" style="columns:1">${gains
          .map((g) => `<li><button type="button" data-focus="${g.iso}">${escapeHtml(app.data.name(g.iso))}</button>
            <span class="subtle">${escapeHtml(CATEGORY_LABEL[g.from])} → ${escapeHtml(CATEGORY_LABEL[g.to])}${g.days ? ` (${g.days}d)` : ""}</span></li>`)
          .join("")}</ul>` : ""}`;
  }

  body.innerHTML = `
    <h2>Two passports</h2>
    <p class="subtle">First passport: <strong>${escapeHtml(app.data.name(passport))}</strong>. Click another country on the map or choose it below.</p>
    <div class="field">
      <label for="second-passport">Second passport</label>
      <select id="second-passport"><option value="">Choose…</option>${options}</select>
    </div>
    ${second ? `<button type="button" class="linklike" id="swap">Swap the two passports</button>` : ""}
    ${summary}`;

  body.querySelector<HTMLSelectElement>("#second-passport")!.addEventListener("change", (e) => {
    app.store.set({ second: (e.target as HTMLSelectElement).value || null });
  });
  body.querySelector("#swap")?.addEventListener("click", () => app.store.set({ passport: second, second: passport }));
  body.querySelector<HTMLInputElement>("#only-gains")?.addEventListener("change", (e) => {
    comboOptions.onlyGains = (e.target as HTMLInputElement).checked;
    void app.render();
  });
  app.bindCountryLinks(body);
}

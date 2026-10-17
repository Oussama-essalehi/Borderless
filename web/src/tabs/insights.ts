import type { App } from "../app";
import { escapeHtml, formatDate, swatch } from "../format";
import { communitySlot, loadNetwork, type NetworkCountry } from "../network";
import { cssVar } from "../theme";
import { fairnessFor } from "../views/reciprocity";

type Metric = "passport_power" | "openness" | "pagerank" | "fairness";

const METRICS: { id: Metric; label: string; help: string }[] = [
  { id: "passport_power", label: "Passport power", help: "Weighted out-degree: how easily this passport's holders get into every other country (100 = visa-free everywhere)." },
  { id: "openness", label: "Openness", help: "Weighted in-degree: how easily every other passport gets in (100 = visa-free for everyone)." },
  { id: "pagerank", label: "Centrality", help: "PageRank on the access graph (×1000): high when a country is easy to reach from passports that are themselves easy to reach." },
  { id: "fairness", label: "Fairness", help: "Share of relationships where both sides grant the same tier of access." },
];

let metric: Metric = "passport_power";

export async function renderInsightsTab(app: App, body: HTMLElement): Promise<void> {
  const network = await loadNetwork();
  const { passport, date } = app.store.state;
  const fairness = fairnessFor(app);
  const value = (c: NetworkCountry) =>
    metric === "fairness" ? fairness.get(c.iso3)?.fairness ?? 0 : (c[metric] as number);
  const sorted = [...network.countries].sort((a, b) => value(b) - value(a));
  const rankOf = new Map(sorted.map((c, i) => [c.iso3, i + 1]));
  const rows = sorted.slice(0, 20);
  if (passport && rankOf.get(passport)! > 20) rows.push(sorted[rankOf.get(passport)! - 1]);
  const fmt = (v: number) => (metric === "fairness" ? `${v.toFixed(1)}%` : metric === "pagerank" ? v.toFixed(2) : v.toFixed(1));
  const help = METRICS.find((m) => m.id === metric)!.help;
  const stale = metric !== "fairness" && date !== network.snapshot_date;

  body.innerHTML = `
    <h2>Network insights</h2>
    <p class="subtle">Visa access as a directed graph: an edge from passport to destination, weighted by ease of entry
      (visa-free ${network.method.edge_weights.visa_free}, on arrival ${network.method.edge_weights.visa_on_arrival},
      ETA ${network.method.edge_weights.eta}, e-visa ${network.method.edge_weights.e_visa},
      visa required ${network.method.edge_weights.visa_required}, no admission: no edge).</p>
    <div class="views" role="group" aria-label="Ranking" id="metric-switch">
      ${METRICS.map((m) => `<button type="button" aria-pressed="${m.id === metric}" data-metric="${m.id}">${m.label}</button>`).join("")}
    </div>
    <p class="subtle">${escapeHtml(help)}${stale ? ` Computed for the ${escapeHtml(formatDate(network.snapshot_date))} snapshot.` : ""}</p>
    <table class="ranking">
      <thead><tr><th class="num">#</th><th>Country</th><th class="num">${escapeHtml(METRICS.find((m) => m.id === metric)!.label)}</th></tr></thead>
      <tbody>${rows
        .map((c) => `<tr class="${c.iso3 === passport ? "is-selected" : ""}"><td class="num">${rankOf.get(c.iso3)}</td>
          <td><button type="button" class="linklike" data-iso="${c.iso3}">${escapeHtml(app.data.name(c.iso3))}</button></td>
          <td class="num">${fmt(value(c))}</td></tr>`)
        .join("")}</tbody>
    </table>

    <h3>Visa blocs</h3>
    <p class="subtle">Louvain community detection on mutual access (each pair weighted by the weaker direction), split
      recursively while the split still has a modularity of at least ${network.method.min_split_modularity}. Labels name
      the reference blocs a community contains.</p>
    <button type="button" class="linklike" id="show-blocs">${app.store.state.view === "community" ? "Blocs are shown on the map" : "Show blocs on the map"}</button>
    ${network.communities
      .map((c) => {
        const members = network.countries.filter((m) => m.community_id === c.community_id).map((m) => m.iso3)
          .sort((a, b) => app.data.name(a).localeCompare(app.data.name(b)));
        return `<details>
          <summary>${swatch(cssVar(communitySlot(c.community_id)))} <strong>${escapeHtml(c.label)}</strong> <span class="subtle">${c.size} countries</span></summary>
          ${c.blocs.length ? `<p class="subtle">Contains ${c.blocs.map((b) => `${escapeHtml(b.name)} (${Math.round(b.share_of_bloc * 100)}% of members)`).join(", ")}.</p>` : ""}
          <ul class="dest-list">${members.map((m) => `<li><button type="button" data-iso="${m}">${escapeHtml(app.data.name(m))}</button></li>`).join("")}</ul>
        </details>`;
      })
      .join("")}
    <p class="note">Communities are a lens, not a treaty map: a country lands in the group it shares the most mutual
      visa-free access with. Mercosur, for instance, sits inside the wider visa-free club around Schengen because its
      members are open to Europe as well as to each other.</p>`;

  body.querySelectorAll<HTMLButtonElement>("[data-metric]").forEach((b) =>
    b.addEventListener("click", () => {
      metric = b.dataset.metric as Metric;
      void renderInsightsTab(app, body);
    }),
  );
  body.querySelector("#show-blocs")!.addEventListener("click", () => app.store.set({ view: "community" }));
  app.bindCountryLinks(body);
}

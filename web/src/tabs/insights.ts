import type { App } from "../app";
import { escapeHtml, formatDate, swatch } from "../format";
import { blocName, formatNumber, percent, t, type Key } from "../i18n";
import { communityLabel, communitySlot, loadNetwork, type NetworkCountry } from "../network";
import { cssVar } from "../theme";
import { fairnessFor } from "../views/reciprocity";

type Metric = "passport_power" | "openness" | "pagerank" | "fairness";

const METRICS: { id: Metric; label: Key; help: Key }[] = [
  { id: "passport_power", label: "insights.power", help: "insights.powerHelp" },
  { id: "openness", label: "insights.openness", help: "insights.opennessHelp" },
  { id: "pagerank", label: "insights.centrality", help: "insights.centralityHelp" },
  { id: "fairness", label: "insights.fairness", help: "insights.fairnessHelp" },
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
  const fmt = (v: number) => (metric === "fairness" ? percent(v, 1) : formatNumber(v, metric === "pagerank" ? 2 : 1));
  const current = METRICS.find((m) => m.id === metric)!;
  const stale = metric !== "fairness" && date !== network.snapshot_date;
  const w = network.method.edge_weights;
  const num = (v: number) => formatNumber(v, 1);

  body.innerHTML = `
    <h2>${escapeHtml(t("insights.title"))}</h2>
    <p class="subtle">${escapeHtml(t("insights.method", { vf: num(w.visa_free), voa: num(w.visa_on_arrival), eta: num(w.eta), ev: num(w.e_visa), vr: num(w.visa_required) }))}</p>
    <div class="views" role="group" aria-label="${escapeHtml(t("insights.rankingLabel"))}" id="metric-switch">
      ${METRICS.map((m) => `<button type="button" aria-pressed="${m.id === metric}" data-metric="${m.id}">${escapeHtml(t(m.label))}</button>`).join("")}
    </div>
    <p class="subtle">${escapeHtml(t(current.help))}${stale ? ` ${escapeHtml(t("insights.computedFor", { date: formatDate(network.snapshot_date) }))}` : ""}</p>
    <table class="ranking">
      <thead><tr><th class="num">#</th><th>${escapeHtml(t("recip.country"))}</th><th class="num">${escapeHtml(t(current.label))}</th></tr></thead>
      <tbody>${rows
        .map((c) => `<tr class="${c.iso3 === passport ? "is-selected" : ""}"><td class="num">${rankOf.get(c.iso3)}</td>
          <td><button type="button" class="linklike" data-iso="${c.iso3}">${escapeHtml(app.data.name(c.iso3))}</button></td>
          <td class="num">${fmt(value(c))}</td></tr>`)
        .join("")}</tbody>
    </table>

    <h3>${escapeHtml(t("insights.blocs"))}</h3>
    <p class="subtle">${escapeHtml(t("insights.blocsMethod", { q: formatNumber(network.method.min_split_modularity, 2) }))}</p>
    <button type="button" class="linklike" id="show-blocs">${escapeHtml(t(app.store.state.view === "community" ? "insights.blocsShown" : "insights.showBlocs"))}</button>
    ${network.communities
      .map((c) => {
        const members = network.countries.filter((m) => m.community_id === c.community_id).map((m) => m.iso3).sort(app.data.byName);
        const contains = c.blocs
          .map((b) => t("insights.ofMembers", { name: blocName(b.code, b.name), pct: percent(b.share_of_bloc * 100) }))
          .join(", ");
        return `<details>
          <summary>${swatch(cssVar(communitySlot(c.community_id)))} <strong>${escapeHtml(communityLabel(c))}</strong> <span class="subtle">${escapeHtml(t("insights.countries", { n: c.size }))}</span></summary>
          ${c.blocs.length ? `<p class="subtle">${escapeHtml(t("insights.contains", { list: contains }))}</p>` : ""}
          <ul class="dest-list">${members.map((m) => `<li><button type="button" data-iso="${m}">${escapeHtml(app.data.name(m))}</button></li>`).join("")}</ul>
        </details>`;
      })
      .join("")}
    <p class="note">${escapeHtml(t("insights.note"))}</p>`;

  body.querySelectorAll<HTMLButtonElement>("[data-metric]").forEach((b) =>
    b.addEventListener("click", () => {
      metric = b.dataset.metric as Metric;
      void renderInsightsTab(app, body);
    }),
  );
  body.querySelector("#show-blocs")!.addEventListener("click", () => app.store.set({ view: "community" }));
  app.bindCountryLinks(body);
}

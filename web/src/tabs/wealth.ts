import type { App } from "../app";
import { renderScatter } from "../charts/scatter";
import { fetchJson } from "../data";
import { escapeHtml, formatDate } from "../format";
import { formatNumber, money, percent, t } from "../i18n";
import { cssVar } from "../theme";

interface WealthFile {
  snapshot_date: string;
  gdp: { r: number; n: number; slope: number; intercept: number; x: string };
  hdi: { r: number; n: number; slope: number; intercept: number; x: string };
  points: {
    iso3: string; score: number; openness: number | null;
    gdp: number | null; gdp_year: number | null; hdi: number | null; hdi_year: number | null;
    residual_gdp: number | null; residual_hdi: number | null;
  }[];
}

let axis: "gdp" | "hdi" = "gdp";
const OUTLIERS = 4; // labelled on each side of the fit

export async function renderWealthTab(app: App, body: HTMLElement): Promise<void> {
  const data = await fetchJson<WealthFile>("wealth.json");
  const { passport } = app.store.state;
  const fit = data[axis];
  const residual = (p: WealthFile["points"][number]) => (axis === "gdp" ? p.residual_gdp : p.residual_hdi);
  const usable = data.points.filter((p) => (axis === "gdp" ? p.gdp : p.hdi) !== null);
  const missing = data.points.filter((p) => (axis === "gdp" ? p.gdp : p.hdi) === null).map((p) => p.iso3).sort(app.data.byName).map((iso) => app.data.name(iso));
  const byResidual = [...usable].sort((a, b) => residual(b)! - residual(a)!);
  const above = byResidual.slice(0, OUTLIERS);
  const below = byResidual.slice(-OUTLIERS).reverse();
  const labelled = new Set([...above, ...below].map((p) => p.iso3));
  const fmtX = (p: WealthFile["points"][number]) =>
    axis === "gdp" ? `${money(p.gdp!)} (${p.gdp_year})` : `${formatNumber(p.hdi!, 3)} (${p.hdi_year})`;
  const describe = (p: WealthFile["points"][number]) => {
    const r = residual(p)!;
    return escapeHtml(t("wealth.describe", { name: app.data.name(p.iso3), score: p.score, delta: `${r > 0 ? "+" : ""}${Math.round(r)}` }));
  };
  const date = formatDate(data.snapshot_date);

  body.innerHTML = `
    <h2>${escapeHtml(t("wealth.title"))}</h2>
    <p class="subtle">${escapeHtml(t(axis === "gdp" ? "wealth.introGdp" : "wealth.introHdi", { date }))}</p>
    <div class="views" role="group" aria-label="${escapeHtml(t("wealth.axisLabel"))}" id="wealth-axis">
      <button type="button" aria-pressed="${axis === "gdp"}" data-axis="gdp">${escapeHtml(t("wealth.gdp"))}</button>
      <button type="button" aria-pressed="${axis === "hdi"}" data-axis="hdi">${escapeHtml(t("wealth.hdi"))}</button>
    </div>
    <div class="hero">
      <div><div class="figure">r = ${formatNumber(fit.r, 2)}</div><div class="label">${escapeHtml(t("wealth.pearson", { n: fit.n }))}</div></div>
      <div><div class="figure">${percent(fit.r * fit.r * 100)}</div><div class="label">${escapeHtml(t("wealth.variance"))}</div></div>
    </div>
    <div class="scatter"></div>
    <h3>${escapeHtml(t(axis === "gdp" ? "wealth.strongerGdp" : "wealth.strongerHdi"))}</h3>
    <ul class="dest-list" style="columns:1">${above.map((p) => `<li><button type="button" data-iso="${p.iso3}">${describe(p)}</button></li>`).join("")}</ul>
    <h3>${escapeHtml(t("wealth.weaker"))}</h3>
    <ul class="dest-list" style="columns:1">${below.map((p) => `<li><button type="button" data-iso="${p.iso3}">${describe(p)}</button></li>`).join("")}</ul>
    <p class="subtle">${escapeHtml(t("wealth.caveat", {
      source: t(axis === "gdp" ? "wealth.sourceGdp" : "wealth.sourceHdi"),
      list: missing.join(", ") || t("wealth.none"),
    }))}</p>`;

  renderScatter(body.querySelector<HTMLElement>(".scatter")!, {
    points: usable.map((p) => ({
      id: p.iso3,
      label: app.data.name(p.iso3),
      x: axis === "gdp" ? p.gdp! : p.hdi!,
      y: p.score,
      labelled: labelled.has(p.iso3),
      tooltip: `<div>${escapeHtml(t("wealth.tipScore", { score: p.score }))}</div><div>${escapeHtml(t(axis === "gdp" ? "wealth.gdp" : "wealth.hdi"))} ${escapeHtml(fmtX(p))}</div>`,
    })),
    xLabel: t(axis === "gdp" ? "wealth.xGdp" : "wealth.xHdi"),
    yLabel: t("history.yLabel"),
    logX: axis === "gdp",
    fit: { slope: fit.slope, intercept: fit.intercept },
    selected: passport,
    color: cssVar("--accent"),
    onPick: (iso) => app.store.set({ passport: iso, view: app.store.state.view === "community" ? "access" : app.store.state.view }),
  });
  body.querySelectorAll<HTMLButtonElement>("[data-axis]").forEach((b) =>
    b.addEventListener("click", () => {
      axis = b.dataset.axis as "gdp" | "hdi";
      void renderWealthTab(app, body);
    }),
  );
  app.bindCountryLinks(body);
}

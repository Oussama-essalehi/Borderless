import type { App } from "../app";
import { renderScatter } from "../charts/scatter";
import { fetchJson } from "../data";
import { escapeHtml, formatDate } from "../format";
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
  const missing = data.points.filter((p) => (axis === "gdp" ? p.gdp : p.hdi) === null).map((p) => app.data.name(p.iso3)).sort();
  const byResidual = [...usable].sort((a, b) => residual(b)! - residual(a)!);
  const above = byResidual.slice(0, OUTLIERS);
  const below = byResidual.slice(-OUTLIERS).reverse();
  const labelled = new Set([...above, ...below].map((p) => p.iso3));
  const fmtX = (p: WealthFile["points"][number]) =>
    axis === "gdp" ? `$${Math.round(p.gdp!).toLocaleString("en")} (${p.gdp_year})` : `${p.hdi!.toFixed(3)} (${p.hdi_year})`;
  const describe = (p: WealthFile["points"][number]) => {
    const r = residual(p)!;
    return `${escapeHtml(app.data.name(p.iso3))}: score ${p.score}, ${r > 0 ? "+" : ""}${r.toFixed(0)} vs expected`;
  };

  body.innerHTML = `
    <h2>Openness vs wealth</h2>
    <p class="subtle">Each dot is a passport in the ${escapeHtml(formatDate(data.snapshot_date))} snapshot: its visa-free score
      against ${axis === "gdp" ? "GDP per capita (log scale, current US$, World Bank)" : "the Human Development Index (UNDP)"}.
      Click a dot to open that passport on the map.</p>
    <div class="views" role="group" aria-label="Wealth measure" id="wealth-axis">
      <button type="button" aria-pressed="${axis === "gdp"}" data-axis="gdp">GDP per capita</button>
      <button type="button" aria-pressed="${axis === "hdi"}" data-axis="hdi">HDI</button>
    </div>
    <div class="hero">
      <div><div class="figure">r = ${fit.r.toFixed(2)}</div><div class="label">Pearson correlation (n = ${fit.n})</div></div>
      <div><div class="figure">${Math.round(fit.r * fit.r * 100)}%</div><div class="label">of the variance explained</div></div>
    </div>
    <div class="scatter"></div>
    <h3>Stronger passport than ${axis === "gdp" ? "income" : "development"} predicts</h3>
    <ul class="dest-list" style="columns:1">${above.map((p) => `<li><button type="button" data-iso="${p.iso3}">${describe(p)}</button></li>`).join("")}</ul>
    <h3>Weaker than predicted</h3>
    <ul class="dest-list" style="columns:1">${below.map((p) => `<li><button type="button" data-iso="${p.iso3}">${describe(p)}</button></li>`).join("")}</ul>
    <p class="subtle">Correlation is not causation: wealth, diplomacy, migration pressure and regional agreements all move
      together. Not plotted (no ${axis === "gdp" ? "World Bank GDP" : "UNDP HDI"} value): ${escapeHtml(missing.join(", ") || "none")}.</p>`;

  renderScatter(body.querySelector<HTMLElement>(".scatter")!, {
    points: usable.map((p) => ({
      id: p.iso3,
      label: app.data.name(p.iso3),
      x: axis === "gdp" ? p.gdp! : p.hdi!,
      y: p.score,
      labelled: labelled.has(p.iso3),
      tooltip: `<div>Visa-free score ${p.score}</div><div>${axis === "gdp" ? "GDP per capita" : "HDI"} ${fmtX(p)}</div>`,
    })),
    xLabel: axis === "gdp" ? "GDP per capita (log)" : "Human Development Index",
    yLabel: "Visa-free score",
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

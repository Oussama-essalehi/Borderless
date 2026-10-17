import type { App } from "../app";
import { renderLineChart } from "../charts/line";
import { escapeHtml, formatDate } from "../format";
import { cssVar } from "../theme";

/** World median visa-free score per snapshot. */
function worldMedian(app: App): (number | null)[] {
  const { dates, passports } = app.data.scores;
  return dates.map((_, i) => {
    const values = Object.values(passports)
      .map((p) => p.score[i])
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    if (!values.length) return null;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  });
}

function covidBand(app: App): { from: string; to: string; label: string } | undefined {
  const covid = app.data.meta.snapshots.filter((s) => s.covid_ban_pairs > 0);
  return covid.length ? { from: "2020-03-11", to: covid[covid.length - 1].date, label: "COVID-19 bans" } : undefined;
}

/** History section: the selected passport (or the world median) over every snapshot. */
export function historySection(app: App, container: HTMLElement): void {
  const { passport, date } = app.store.state;
  const { dates } = app.data.scores;
  const median = worldMedian(app);
  const series = passport
    ? [
        { label: app.data.name(passport), values: app.data.scores.passports[passport]?.score ?? [], color: cssVar("--accent") },
        { label: "World median", values: median, color: cssVar("--muted"), dashed: true },
      ]
    : [{ label: "World median", values: median, color: cssVar("--accent") }];

  let biggest = "";
  const values = series[0].values;
  let best = { delta: 0, i: -1 };
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1], b = values[i];
    if (a !== null && b !== null && Math.abs(b - a) > Math.abs(best.delta)) best = { delta: b - a, i };
  }
  if (best.i > 0) {
    biggest = `Biggest move between two snapshots: <strong>${best.delta > 0 ? "+" : ""}${Math.round(best.delta)}</strong>
      (${escapeHtml(formatDate(dates[best.i - 1], "short"))} → ${escapeHtml(formatDate(dates[best.i], "short"))}).`;
  }

  container.innerHTML = `
    <h3>Visa-free score over time</h3>
    ${passport ? `<div class="legend-inline"><span><span class="swatch" style="background:${cssVar("--accent")}"></span>${escapeHtml(app.data.name(passport))}</span><span><span class="dash"></span>World median</span></div>` : ""}
    <div class="history-chart"></div>
    <p class="subtle">${biggest} Shaded: COVID-19 entry bans. Dotted lines mark events; blue lines mark ETA milestones.
      Click the chart to open that snapshot.</p>`;
  renderLineChart(container.querySelector<HTMLElement>(".history-chart")!, {
    dates,
    series,
    current: date,
    events: app.data.meta.events,
    band: covidBand(app),
    yLabel: "Visa-free score",
    onPick: (d) => app.store.set({ date: d }),
  });
}

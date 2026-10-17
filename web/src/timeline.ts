import type { App } from "./app";
import { escapeHtml, formatDate } from "./format";
import { formatNumber, t } from "./i18n";
import { localEvents } from "./tabs/history";

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Time slider across all snapshots. The track is proportional to real time,
 * so gaps in the data (mid-2020, 2025) are visible; the thumb snaps to the
 * nearest snapshot and arrow keys step from one snapshot to the next.
 */
export function setupTimeline(app: App, root: HTMLElement): () => void {
  let builtFor: string | null = null;
  let sync: () => void = () => {};
  return () => {
    // Rebuilt when the language changes (labels, event titles); synced on every render.
    if (builtFor !== app.store.state.lang) {
      builtFor = app.store.state.lang;
      sync = buildTimeline(app, root);
    }
    sync();
  };
}

function buildTimeline(app: App, root: HTMLElement): () => void {
  const snaps = app.data.meta.snapshots;
  const dates = snaps.map((s) => s.date);
  const start = ms(dates[0]);
  const span = Math.round((ms(dates[dates.length - 1]) - start) / DAY);
  const pos = (iso: string) => (100 * Math.round((ms(iso) - start) / DAY)) / span;

  const covid = snaps.filter((s) => s.covid_ban_pairs > 0);
  const covidBand = covid.length
    ? `<div class="tl-band" style="left:${pos("2020-03-11")}%;width:${pos(covid[covid.length - 1].date) - pos("2020-03-11")}%" title="${escapeHtml(t("tl.covidBand"))}"></div>`
    : "";
  const gaps = snaps
    .slice(1)
    .map((s, i) => ({ from: snaps[i].date, to: s.date }))
    .filter((g) => (ms(g.to) - ms(g.from)) / DAY > 120)
    .map((g) => `<div class="tl-gap" style="left:${pos(g.from)}%;width:${pos(g.to) - pos(g.from)}%" title="${escapeHtml(t("tl.gap", { from: formatDate(g.from), to: formatDate(g.to) }))}"></div>`)
    .join("");
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))]
    .map((y) => `${y}-01-01`)
    .filter((d) => ms(d) >= start)
    .map((d) => `<span class="tl-year" style="left:${pos(d)}%">${d.slice(0, 4)}</span>`)
    .join("");
  const ticks = dates.map((d) => `<span class="tl-tick" style="left:${pos(d)}%"></span>`).join("");
  const events = localEvents(app)
    .filter((e) => ms(e.date) >= start && ms(e.date) <= ms(dates[dates.length - 1]))
    .map(
      (e) => `<button type="button" class="tl-event tl-${e.kind}" style="left:${pos(e.date)}%" data-date="${e.date}"
        aria-label="${escapeHtml(`${formatDate(e.date)}: ${e.title}`)}" title="${escapeHtml(`${formatDate(e.date)} — ${e.title}: ${e.description}`)}"></button>`,
    )
    .join("");

  root.innerHTML = `
    <div class="tl">
      <div class="tl-head">
        <button type="button" class="icon-button tl-step" data-step="-1" aria-label="${escapeHtml(t("tl.prev"))}">‹</button>
        <div class="tl-label"><span class="subtle">${escapeHtml(t("tl.snapshot"))}</span> <strong id="tl-date"></strong> <span id="tl-note" class="subtle"></span></div>
        <button type="button" class="icon-button tl-step" data-step="1" aria-label="${escapeHtml(t("tl.next"))}">›</button>
        <button type="button" class="linklike tl-latest" id="tl-latest">${escapeHtml(t("tl.latest"))}</button>
      </div>
      <div class="tl-track">
        ${covidBand}${gaps}${ticks}${events}
        <input type="range" id="tl-range" min="0" max="${span}" step="1" aria-label="${escapeHtml(t("tl.range"))}"
          aria-valuetext="" />
      </div>
      <div class="tl-years" aria-hidden="true">${years}</div>
    </div>`;

  const range = root.querySelector<HTMLInputElement>("#tl-range")!;
  const nearest = (day: number) => {
    const target = start + day * DAY;
    return dates.reduce((best, d) => (Math.abs(ms(d) - target) < Math.abs(ms(best) - target) ? d : best), dates[0]);
  };
  const step = (delta: number) => {
    const i = dates.indexOf(app.store.state.date) + delta;
    if (i >= 0 && i < dates.length) app.store.set({ date: dates[i] });
  };

  let pending = 0;
  range.addEventListener("input", () => {
    const date = nearest(Number(range.value));
    range.value = String(Math.round((ms(date) - start) / DAY));
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => app.store.set({ date }));
  });
  range.addEventListener("keydown", (e) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    if (e.key in keys) {
      e.preventDefault();
      step(keys[e.key]);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      app.store.set({ date: e.key === "Home" ? dates[0] : dates[dates.length - 1] });
    }
  });
  root.querySelectorAll<HTMLButtonElement>(".tl-step").forEach((b) => b.addEventListener("click", () => step(Number(b.dataset.step))));
  root.querySelector("#tl-latest")!.addEventListener("click", () => app.store.set({ date: app.data.latestDate }));
  root.querySelectorAll<HTMLButtonElement>(".tl-event").forEach((b) =>
    b.addEventListener("click", () => app.store.set({ date: nearest(Math.round((ms(b.dataset.date!) - start) / DAY)) })),
  );

  return () => {
    const { date } = app.store.state;
    const info = snaps.find((s) => s.date === date)!;
    range.value = String(Math.round((ms(date) - start) / DAY));
    range.setAttribute("aria-valuetext", formatDate(date));
    root.querySelector("#tl-date")!.textContent = formatDate(date);
    const notes = [];
    if (info.covid_ban_pairs > 0) notes.push(t("tl.covidBans", { n: formatNumber(info.covid_ban_pairs) }));
    if (info.source_changed) notes.push(t("tl.newSource"));
    if (info.value_format !== "label") notes.push(t("tl.mixed"));
    else if (!info.eta_is_distinct) notes.push(t("tl.etaMerged"));
    if (info.value_format === "numeric_code") notes.push(t("tl.noDays"));
    root.querySelector("#tl-note")!.textContent = notes.length ? `· ${notes.join(" · ")}` : "";
    root.querySelector<HTMLButtonElement>("#tl-latest")!.hidden = date === app.data.latestDate;
    const i = dates.indexOf(date);
    root.querySelector<HTMLButtonElement>('[data-step="-1"]')!.disabled = i <= 0;
    root.querySelector<HTMLButtonElement>('[data-step="1"]')!.disabled = i >= dates.length - 1;
  };
}

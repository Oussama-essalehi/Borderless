import type { App } from "../app";
import { fetchJson } from "../data";
import { categoryColor, categoryLabel, escapeHtml, formatDate, swatch } from "../format";
import { formatNumber, t, type Key } from "../i18n";
import type { CategoryKey } from "../types";

type ChangeType = "gained_visa_free" | "lost_visa_free" | "new_eta" | "eta_removed" | "eased" | "tightened" | "stay_changed";
type Change = [string, string, CategoryKey, CategoryKey, number | null, number | null, ChangeType, boolean];

interface ChangesFile {
  snapshot_date: string;
  previous_snapshot_date: string;
  source_changed: boolean;
  days_between: number;
  summary: Record<ChangeType, number>;
  changes: Change[];
}

const TYPES: ChangeType[] = ["gained_visa_free", "lost_visa_free", "new_eta", "eta_removed", "eased", "tightened", "stay_changed"];

const PAGE = 150;
let filter: ChangeType | "all" = "new_eta";
let onlySelected = true;
let shown = PAGE;

function describe(c: CategoryKey, days: number | null): string {
  return `${categoryLabel(c)}${c === "visa_free" && days ? ` ${t("common.daysShort", { n: days })}` : ""}`;
}

/** Access changes between the two latest snapshots; each row opens the pair on the map. */
export async function renderChangesTab(app: App, body: HTMLElement): Promise<void> {
  const data = await fetchJson<ChangesFile>("changes.json");
  const { passport } = app.store.state;
  const scoped = passport && onlySelected
    ? data.changes.filter((c) => c[0] === passport || c[1] === passport)
    : data.changes;
  const count = (type: ChangeType) => scoped.filter((c) => c[6] === type).length;
  const rows = scoped
    .filter((c) => filter === "all" || c[6] === filter)
    .sort((a, b) => app.data.byName(a[0], b[0]) || app.data.byName(a[1], b[1]));
  const months = Math.round(data.days_between / 30.4);

  body.innerHTML = `
    <h2>${escapeHtml(t("changes.title"))}</h2>
    <p class="subtle">${t("changes.between", {
      from: escapeHtml(formatDate(data.previous_snapshot_date)),
      to: escapeHtml(formatDate(data.snapshot_date)),
      months,
      n: formatNumber(data.changes.length),
    })}</p>
    ${data.source_changed ? `<p class="note">${escapeHtml(t("changes.sourceNote", { months }))}</p>` : ""}
    ${passport ? `<label class="check"><input type="checkbox" id="only-selected"${onlySelected ? " checked" : ""}/>
      ${escapeHtml(t("changes.onlySelected", { name: app.data.name(passport) }))}</label>` : ""}
    <div class="chips" role="group" aria-label="${escapeHtml(t("changes.typeLabel"))}">
      <button type="button" class="chip-button" aria-pressed="${filter === "all"}" data-type="all">${escapeHtml(t("changes.all"))} <span>${scoped.length}</span></button>
      ${TYPES.map((type) => `<button type="button" class="chip-button" aria-pressed="${filter === type}" data-type="${type}">${escapeHtml(t(`changes.${type}` as Key))} <span>${count(type)}</span></button>`).join("")}
    </div>
    <ul class="changes">${rows
      .slice(0, shown)
      .map(([p, d, from, to, fromDays, toDays]) => `<li><button type="button" data-pair="${p}:${d}">
        <span class="pair">${escapeHtml(app.data.name(p))} → ${escapeHtml(app.data.name(d))}</span>
        <span class="move">${swatch(categoryColor(from))}${escapeHtml(describe(from, fromDays))} → ${swatch(categoryColor(to))}${escapeHtml(describe(to, toDays))}</span>
      </button></li>`)
      .join("") || `<li class="subtle">${escapeHtml(t("changes.none"))}</li>`}</ul>
    ${rows.length > shown ? `<button type="button" class="linklike" id="more">${escapeHtml(t("changes.more", { n: Math.min(PAGE, rows.length - shown), rest: rows.length - shown }))}</button>` : ""}
    <p class="subtle">${escapeHtml(t("changes.note"))}</p>`;

  body.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.type as ChangeType | "all";
      shown = PAGE;
      void renderChangesTab(app, body);
    }),
  );
  body.querySelector<HTMLInputElement>("#only-selected")?.addEventListener("change", (e) => {
    onlySelected = (e.target as HTMLInputElement).checked;
    shown = PAGE;
    void renderChangesTab(app, body);
  });
  body.querySelector("#more")?.addEventListener("click", () => {
    shown += PAGE;
    void renderChangesTab(app, body);
  });
  body.querySelectorAll<HTMLButtonElement>("[data-pair]").forEach((b) =>
    b.addEventListener("click", () => {
      const [p, d] = b.dataset.pair!.split(":");
      const view = app.store.state.view === "access" || app.store.state.view === "reciprocity" ? app.store.state.view : "access";
      app.focusCountry(d, { passport: p, date: data.snapshot_date, view });
    }),
  );
}

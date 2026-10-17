import type { App } from "../app";
import { fetchJson } from "../data";
import { CATEGORY_LABEL, categoryColor, escapeHtml, formatDate, swatch } from "../format";
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

const TYPES: { id: ChangeType; label: string }[] = [
  { id: "gained_visa_free", label: "Gained visa-free" },
  { id: "lost_visa_free", label: "Lost visa-free" },
  { id: "new_eta", label: "New ETA" },
  { id: "eta_removed", label: "ETA removed" },
  { id: "eased", label: "Other easing" },
  { id: "tightened", label: "Other tightening" },
  { id: "stay_changed", label: "Stay length changed" },
];

const PAGE = 150;
let filter: ChangeType | "all" = "new_eta";
let onlySelected = true;
let shown = PAGE;

function describe(c: CategoryKey, days: number | null): string {
  return `${CATEGORY_LABEL[c]}${c === "visa_free" && days ? ` ${days}d` : ""}`;
}

/** Access changes between the two latest snapshots; each row opens the pair on the map. */
export async function renderChangesTab(app: App, body: HTMLElement): Promise<void> {
  const data = await fetchJson<ChangesFile>("changes.json");
  const { passport } = app.store.state;
  const scoped = passport && onlySelected
    ? data.changes.filter((c) => c[0] === passport || c[1] === passport)
    : data.changes;
  const count = (t: ChangeType) => scoped.filter((c) => c[6] === t).length;
  const rows = scoped
    .filter((c) => filter === "all" || c[6] === filter)
    .sort((a, b) => app.data.name(a[0]).localeCompare(app.data.name(b[0])) || app.data.name(a[1]).localeCompare(app.data.name(b[1])));

  body.innerHTML = `
    <h2>What changed</h2>
    <p class="subtle">Between the <strong>${escapeHtml(formatDate(data.previous_snapshot_date))}</strong> and
      <strong>${escapeHtml(formatDate(data.snapshot_date))}</strong> snapshots
      (${Math.round(data.days_between / 30.4)} months): ${data.changes.length.toLocaleString("en")} passport–destination pairs changed.</p>
    ${data.source_changed ? `<p class="note">The latest snapshot comes from the dataset's new maintainer, and there are
      ${Math.round(data.days_between / 30.4)} months between the two. Most changes are real policy moves (for example the
      UK and Israeli ETAs), but a few may come from differences in how the two scrapers read the source.</p>` : ""}
    ${passport ? `<label class="check"><input type="checkbox" id="only-selected"${onlySelected ? " checked" : ""}/>
      Only changes involving ${escapeHtml(app.data.name(passport))}</label>` : ""}
    <div class="chips" role="group" aria-label="Type of change">
      <button type="button" class="chip-button" aria-pressed="${filter === "all"}" data-type="all">All <span>${scoped.length}</span></button>
      ${TYPES.map((t) => `<button type="button" class="chip-button" aria-pressed="${filter === t.id}" data-type="${t.id}">${t.label} <span>${count(t.id)}</span></button>`).join("")}
    </div>
    <ul class="changes">${rows
      .slice(0, shown)
      .map(([p, d, from, to, fromDays, toDays]) => `<li><button type="button" data-pair="${p}:${d}">
        <span class="pair">${escapeHtml(app.data.name(p))} → ${escapeHtml(app.data.name(d))}</span>
        <span class="move">${swatch(categoryColor(from))}${escapeHtml(describe(from, fromDays))} → ${swatch(categoryColor(to))}${escapeHtml(describe(to, toDays))}</span>
      </button></li>`)
      .join("") || `<li class="subtle">No changes of this type.</li>`}</ul>
    ${rows.length > shown ? `<button type="button" class="linklike" id="more">Show ${Math.min(PAGE, rows.length - shown)} more of ${rows.length - shown}</button>` : ""}
    <p class="subtle">"Passport → destination": what holders of the first passport need to enter the second country.
      Click a row to see it on the map.</p>`;

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

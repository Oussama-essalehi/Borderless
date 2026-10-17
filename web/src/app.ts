import { DataStore } from "./data";
import { MapView } from "./map";
import type { Matrix } from "./matrix";
import { Store, parseUrl, type AppState, type Tab, type View } from "./state";
import { currentTheme } from "./theme";
import { escapeHtml, formatDate } from "./format";
import type { SnapshotInfo } from "./types";
import type { Topology } from "topojson-specification";

export interface ViewDef {
  id: View;
  label: string;
  /** Map colour for a country (ISO-3), or null for "no data". */
  color(app: App, iso3: string): string | null;
  tooltip(app: App, iso3: string): string;
  legend(app: App, el: HTMLElement): void;
  /** Views that need data beyond the snapshot matrix load it here. */
  prepare?(app: App): Promise<void>;
}

export interface TabDef {
  id: Tab;
  label: string;
  render(app: App, body: HTMLElement): void | Promise<void>;
}

const SCORE_RAMP_LIGHT = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const SCORE_RAMP_DARK = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"];

export function scoreRamp(): string[] {
  return currentTheme() === "dark" ? SCORE_RAMP_DARK : SCORE_RAMP_LIGHT;
}

export class App {
  readonly store: Store;
  readonly map: MapView;
  matrix: Matrix | null = null;
  private views = new Map<View, ViewDef>();
  private tabs = new Map<Tab, TabDef>();
  private renderToken = 0;
  private afterRender: (() => void)[] = [];
  private hoverIso: string | null = null;
  private els = {
    tooltip: document.getElementById("tooltip")!,
    legend: document.getElementById("legend")!,
    tabs: document.getElementById("tabs")!,
    tabBody: document.getElementById("tab-body")!,
    views: document.getElementById("view-switch")!,
    status: document.getElementById("map-status")!,
    disclaimer: document.getElementById("disclaimer")!,
  };

  constructor(readonly data: DataStore, topo: Topology) {
    const dates = data.meta.snapshots.map((s) => s.date);
    const defaults: AppState = { passport: null, second: null, date: data.latestDate, view: "access", tab: "passport", focus: null };
    this.store = new Store(parseUrl(location.search, defaults, (iso) => data.byIso.get(iso)?.visa_data ?? false, dates), data.latestDate);

    this.map = new MapView(document.getElementById("map")!, topo, (ne) => {
      const c = data.byNe.get(ne);
      return c?.visa_data && c.lon !== null && c.lat !== null ? [c.lon, c.lat] : null;
    });
    this.map.onClick((ne) => {
      const country = data.byNe.get(ne);
      if (country?.visa_data) this.selectPassport(country.iso3);
    });
    this.map.onHover((ne, point) => this.showTooltip(ne ? data.byNe.get(ne)?.iso3 ?? null : null, point, ne));

    this.store.subscribe(() => void this.render());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) {
        this.store.set(this.store.state.focus ? { focus: null } : { passport: null, second: null });
      }
    });
  }

  registerView(view: ViewDef): void {
    this.views.set(view.id, view);
  }

  /** Called after every render (e.g. to sync the timeline). */
  onRender(callback: () => void): void {
    this.afterRender.push(callback);
  }

  registerTab(tab: TabDef): void {
    this.tabs.set(tab.id, tab);
  }

  get snapshotInfo(): SnapshotInfo | undefined {
    return this.data.meta.snapshots.find((s) => s.date === this.store.state.date);
  }

  get view(): ViewDef {
    return this.views.get(this.store.state.view) ?? this.views.get("access")!;
  }

  selectPassport(iso3: string): void {
    const { state } = this.store;
    if (state.view === "combo" && state.passport && state.passport !== iso3) {
      this.store.set({ second: iso3, focus: null });
    } else {
      this.store.set({ passport: iso3, focus: null });
    }
  }

  /** Wire up buttons rendered in panels: data-iso selects a passport, data-focus highlights a destination. */
  bindCountryLinks(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>("button[data-iso]").forEach((b) =>
      b.addEventListener("click", () => this.store.set({ passport: b.dataset.iso!, focus: null })),
    );
    root.querySelectorAll<HTMLButtonElement>("button[data-focus]").forEach((b) =>
      b.addEventListener("click", () => this.focusCountry(b.dataset.focus!)),
    );
  }

  focusCountry(iso3: string, patch: Partial<AppState> = {}): void {
    this.store.set({ ...patch, focus: iso3 });
    const pts = [iso3, patch.passport ?? null]
      .map((iso) => (iso ? this.data.byIso.get(iso) : undefined))
      .filter((c) => c && c.lon !== null && c.lat !== null)
      .map((c) => [c!.lon!, c!.lat!] as [number, number]);
    void this.map.flyTo(pts);
  }

  async start(): Promise<void> {
    this.renderViewSwitch();
    await this.render();
  }

  async render(): Promise<void> {
    const token = ++this.renderToken;
    const { state } = this.store;
    if (!this.matrix || this.matrix.date !== state.date) {
      this.setStatus(`Loading the ${formatDate(state.date)} snapshot…`);
      try {
        const matrix = await this.data.matrix(state.date);
        if (token !== this.renderToken) return;
        this.matrix = matrix;
      } catch (err) {
        this.setStatus(`Could not load this snapshot: ${(err as Error).message}`);
        return;
      }
    }
    const view = this.view;
    if (view.prepare) {
      await view.prepare(this);
      if (token !== this.renderToken) return;
    }
    this.setStatus(null);

    const ne = (c: string) => this.data.byNe.get(c);
    await this.map.paint({
      color: (code) => {
        const country = ne(code);
        return country ? view.color(this, country.iso3) : null;
      },
      selected: this.data.byIso.get(state.passport ?? "")?.ne ?? null,
      second: state.view === "combo" ? this.data.byIso.get(state.second ?? "")?.ne ?? null : null,
      focus: this.data.byIso.get(state.focus ?? "")?.ne ?? null,
    });
    view.legend(this, this.els.legend);
    this.renderViewSwitch();
    await this.renderTabs();
    this.renderDisclaimer();
    if (this.hoverIso) this.refreshTooltip();
    for (const callback of this.afterRender) callback();
  }

  /** Re-colour after a theme change. */
  async themeChanged(): Promise<void> {
    await this.map.refreshTheme();
    await this.render();
  }

  private renderViewSwitch(): void {
    const current = this.store.state.view;
    const html = [...this.views.values()]
      .map((v) => `<button type="button" aria-pressed="${v.id === current}" data-view="${v.id}">${escapeHtml(v.label)}</button>`)
      .join("");
    if (this.els.views.innerHTML !== html) {
      this.els.views.innerHTML = html;
      this.els.views.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
        b.addEventListener("click", () => {
          const view = b.dataset.view as View;
          // The two-passport controls live in the Passport tab.
          this.store.set(view === "combo" ? { view, tab: "passport" } : { view });
        }),
      );
    }
    this.els.views.hidden = this.views.size < 2;
  }

  private async renderTabs(): Promise<void> {
    const current = this.store.state.tab;
    const html = [...this.tabs.values()]
      .map((t) => `<button type="button" role="tab" id="tab-${t.id}" aria-selected="${t.id === current}" aria-controls="tab-body" data-tab="${t.id}">${escapeHtml(t.label)}</button>`)
      .join("");
    if (this.els.tabs.innerHTML !== html) {
      this.els.tabs.innerHTML = html;
      this.els.tabs.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
        b.addEventListener("click", () => this.store.set({ tab: b.dataset.tab as Tab }));
        b.addEventListener("keydown", (e) => {
          const buttons = [...this.els.tabs.querySelectorAll<HTMLButtonElement>("button")];
          const i = buttons.indexOf(b);
          const next = e.key === "ArrowRight" ? buttons[i + 1] : e.key === "ArrowLeft" ? buttons[i - 1] : null;
          if (next) {
            next.focus();
            next.click();
          }
        });
      });
    }
    this.els.tabs.hidden = this.tabs.size < 2;
    const tab = this.tabs.get(current) ?? this.tabs.get("passport")!;
    this.els.tabBody.setAttribute("role", "tabpanel");
    this.els.tabBody.setAttribute("aria-labelledby", `tab-${tab.id}`);
    await tab.render(this, this.els.tabBody);
  }

  private renderDisclaimer(): void {
    const { date } = this.store.state;
    const latest = this.data.latestDate;
    const snapshot = date === latest ? `Data snapshot: ${formatDate(latest)}` : `Viewing ${formatDate(date)} · latest data: ${formatDate(latest)}`;
    this.els.disclaimer.innerHTML = `<span>${escapeHtml(snapshot)}. Visa rules change often. Always check the destination's official government source before travelling.</span>
      <span class="sources">Data: Passport Index dataset (MIT), World Bank, UNDP, Natural Earth</span>`;
  }

  private setStatus(text: string | null): void {
    this.els.status.hidden = !text;
    this.els.status.textContent = text ?? "";
  }

  private lastPoint = { x: 0, y: 0 };
  private lastNe: string | null = null;

  private showTooltip(iso3: string | null, point: { x: number; y: number }, ne: string | null): void {
    this.hoverIso = iso3;
    this.lastPoint = point;
    this.lastNe = ne;
    this.refreshTooltip();
  }

  private refreshTooltip(): void {
    const el = this.els.tooltip;
    if (!this.lastNe) {
      el.hidden = true;
      return;
    }
    const country = this.data.byNe.get(this.lastNe);
    el.innerHTML = country && this.matrix?.has(country.iso3)
      ? this.view.tooltip(this, country.iso3)
      : `<strong>${escapeHtml(country?.name ?? "Unmapped area")}</strong><div class="hint">No data in the visa dataset for this territory.</div>`;
    el.hidden = false;
    const wrap = el.parentElement!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const x = Math.min(this.lastPoint.x + 14, wrap.width - box.width - 8);
    const y = this.lastPoint.y + 14 + box.height > wrap.height ? this.lastPoint.y - box.height - 10 : this.lastPoint.y + 14;
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${Math.max(8, y)}px`;
  }
}

import type { Lang } from "./i18n";

export type View = "access" | "reciprocity" | "combo" | "community";
export type Tab = "passport" | "insights" | "wealth" | "trips" | "changes";

export interface AppState {
  passport: string | null;
  second: string | null;
  date: string;
  view: View;
  tab: Tab;
  /** A destination to highlight (e.g. from the changes list). */
  focus: string | null;
  lang: Lang;
}

const VIEWS: View[] = ["access", "reciprocity", "combo", "community"];
const TABS: Tab[] = ["passport", "insights", "wealth", "trips", "changes"];
const ISO3 = /^[A-Z]{3}$/;

type Listener = (state: AppState, previous: AppState) => void;

export function parseUrl(search: string, defaults: AppState, isKnown: (iso3: string) => boolean, dates: string[]): AppState {
  const params = new URLSearchParams(search);
  const iso = (key: string) => {
    const value = params.get(key)?.toUpperCase() ?? null;
    return value && ISO3.test(value) && isKnown(value) ? value : null;
  };
  const view = params.get("view") as View | null;
  const tab = params.get("tab") as Tab | null;
  const date = params.get("date");
  const lang = params.get("lang");
  return {
    passport: iso("passport"),
    second: iso("with"),
    date: date && dates.includes(date) ? date : defaults.date,
    view: view && VIEWS.includes(view) ? view : defaults.view,
    tab: tab && TABS.includes(tab) ? tab : defaults.tab,
    focus: iso("focus"),
    lang: lang === "en" || lang === "fr" ? lang : defaults.lang,
  };
}

export function toSearch(state: AppState, latestDate: string): string {
  const params = new URLSearchParams();
  if (state.passport) params.set("passport", state.passport);
  if (state.second && state.view === "combo") params.set("with", state.second);
  if (state.view !== "access") params.set("view", state.view);
  if (state.tab !== "passport") params.set("tab", state.tab);
  if (state.date !== latestDate) params.set("date", state.date);
  if (state.focus) params.set("focus", state.focus);
  // Always explicit so a shared link opens in the language it was shared in.
  params.set("lang", state.lang);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export class Store {
  private listeners: Listener[] = [];

  constructor(private current: AppState, private readonly latestDate: string) {}

  get state(): AppState {
    return this.current;
  }

  set(patch: Partial<AppState>): void {
    const previous = this.current;
    const next = { ...previous, ...patch };
    if (JSON.stringify(next) === JSON.stringify(previous)) return;
    this.current = next;
    const url = `${location.pathname}${toSearch(next, this.latestDate)}${location.hash}`;
    history.replaceState(null, "", url);
    for (const listener of this.listeners) listener(next, previous);
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }
}

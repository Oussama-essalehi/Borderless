import "./styles.css";
import type { Topology } from "topojson-specification";
import { App } from "./app";
import { DataStore } from "./data";
import { detectLang, setLang, t } from "./i18n";
import { applyPageText, setupLangToggle } from "./page";
import { setupSearch } from "./search";
import { setupAbout } from "./about";
import { setupWelcome } from "./welcome";
import { setupTheme } from "./theme";
import { setupTimeline } from "./timeline";
import { renderPassportTab } from "./tabs/passport";
import { accessView } from "./views/access";
import { reciprocityView } from "./views/reciprocity";
import { communityView } from "./views/community";
import { comboView } from "./views/combo";

async function main(): Promise<void> {
  // Translate the static page right away, before the data arrives.
  setLang(detectLang());
  applyPageText();

  const [data, topo] = await Promise.all([
    DataStore.load(),
    fetch(`${import.meta.env.BASE_URL}geo/countries.topo.json`).then((r) => r.json() as Promise<Topology>),
  ]);
  const app = new App(data, topo);
  app.registerView(accessView);
  app.registerView(reciprocityView);
  app.registerView(comboView);
  app.registerView(communityView);
  app.registerTab({ id: "passport", label: () => t("tab.passport"), render: renderPassportTab });
  // Secondary tabs are loaded on first use to keep the first page load small.
  app.registerTab({ id: "insights", label: () => t("tab.insights"), render: async (a, b) => (await import("./tabs/insights")).renderInsightsTab(a, b) });
  app.registerTab({ id: "wealth", label: () => t("tab.wealth"), render: async (a, b) => (await import("./tabs/wealth")).renderWealthTab(a, b) });
  app.registerTab({ id: "trips", label: () => t("tab.trips"), render: async (a, b) => (await import("./tabs/trips")).renderTripsTab(a, b) });
  app.registerTab({ id: "changes", label: () => t("tab.changes"), render: async (a, b) => (await import("./tabs/changes")).renderChangesTab(a, b) });

  const refreshTheme = setupTheme(document.getElementById("theme-toggle") as HTMLButtonElement, () => void app.themeChanged());
  app.onLangChange(refreshTheme);
  app.onLangChange(() => app.map.setAttribution(t("map.attribution")));
  setupLangToggle(app, document.getElementById("lang-toggle") as HTMLButtonElement);
  setupSearch(app);
  setupAbout(app);
  const welcome = setupWelcome(app, document.getElementById("welcome-open") as HTMLButtonElement);
  app.onRender(setupTimeline(app, document.getElementById("timeline")!));
  new ResizeObserver(() => app.map.resize()).observe(document.getElementById("map")!);
  await app.start();
  welcome.showIfFirstVisit();
}

main().catch((err) => {
  console.error(err);
  const status = document.getElementById("map-status");
  if (status) {
    status.hidden = false;
    status.textContent = t("page.loadError");
  }
});

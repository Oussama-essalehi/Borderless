import "./styles.css";
import type { Topology } from "topojson-specification";
import { App } from "./app";
import { DataStore } from "./data";
import { setupSearch } from "./search";
import { setupAbout } from "./about";
import { setupTheme } from "./theme";
import { setupTimeline } from "./timeline";
import { renderPassportTab } from "./tabs/passport";
import { accessView } from "./views/access";
import { reciprocityView } from "./views/reciprocity";
import { communityView } from "./views/community";
import { comboView } from "./views/combo";

async function main(): Promise<void> {
  const [data, topo] = await Promise.all([
    DataStore.load(),
    fetch(`${import.meta.env.BASE_URL}geo/countries.topo.json`).then((r) => r.json() as Promise<Topology>),
  ]);
  const app = new App(data, topo);
  app.registerView(accessView);
  app.registerView(reciprocityView);
  app.registerView(comboView);
  app.registerView(communityView);
  app.registerTab({ id: "passport", label: "Passport", render: renderPassportTab });
  // Secondary tabs are loaded on first use to keep the first page load small.
  app.registerTab({ id: "insights", label: "Insights", render: async (a, b) => (await import("./tabs/insights")).renderInsightsTab(a, b) });
  app.registerTab({ id: "wealth", label: "Wealth", render: async (a, b) => (await import("./tabs/wealth")).renderWealthTab(a, b) });
  app.registerTab({ id: "trips", label: "Trips", render: async (a, b) => (await import("./tabs/trips")).renderTripsTab(a, b) });
  app.registerTab({ id: "changes", label: "Changes", render: async (a, b) => (await import("./tabs/changes")).renderChangesTab(a, b) });

  setupTheme(document.getElementById("theme-toggle") as HTMLButtonElement, () => void app.themeChanged());
  setupSearch(app);
  setupAbout(app);
  app.onRender(setupTimeline(app, document.getElementById("timeline")!));
  new ResizeObserver(() => app.map.resize()).observe(document.getElementById("map")!);
  await app.start();
}

main().catch((err) => {
  console.error(err);
  const status = document.getElementById("map-status");
  if (status) {
    status.hidden = false;
    status.textContent = "Something went wrong while loading the data. Please reload the page.";
  }
});

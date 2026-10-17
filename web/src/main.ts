import "./styles.css";
import type { Topology } from "topojson-specification";
import { App } from "./app";
import { DataStore } from "./data";
import { setupSearch } from "./search";
import { setupTheme } from "./theme";
import { renderPassportTab } from "./tabs/passport";
import { accessView } from "./views/access";

async function main(): Promise<void> {
  const [data, topo] = await Promise.all([
    DataStore.load(),
    fetch(`${import.meta.env.BASE_URL}geo/countries.topo.json`).then((r) => r.json() as Promise<Topology>),
  ]);
  const app = new App(data, topo);
  app.registerView(accessView);
  app.registerTab({ id: "passport", label: "Passport", render: renderPassportTab });

  setupTheme(document.getElementById("theme-toggle") as HTMLButtonElement, () => void app.themeChanged());
  setupSearch(app);
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

// Builds public/geo/countries.topo.json from Natural Earth 1:50m admin-0.
// Uses the pipeline's raw cache when present, otherwise downloads the file.
// Only ADM0_A3 and NAME are kept; the ISO-3 join happens in the browser
// through countries.json, so all code mapping stays in dbt.
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mapshaper from "mapshaper";

const here = dirname(fileURLToPath(import.meta.url));
const cached = resolve(here, "../../pipeline/raw/natural_earth/ne_50m_admin_0_countries.geojson");
const url =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson";
const outDir = resolve(here, "../public/geo");
const out = resolve(outDir, "countries.topo.json");

let input = cached;
if (!existsSync(cached)) {
  const tmp = resolve(here, "../.ne_50m_admin_0_countries.geojson");
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  input = tmp;
}

mkdirSync(outDir, { recursive: true });
// Features under ~6,000 km² (microstates, small islands) are flagged so the map
// can also draw a clickable dot for them.
await mapshaper.runCommands(
  [
    `-i "${input}"`,
    "-simplify 10% weighted keep-shapes",
    "-filter 'ADM0_A3 != \"ATA\"'",
    "-each 'small=this.area<6e9?1:0'",
    "-filter-fields ADM0_A3,NAME,small",
    "-rename-fields ne=ADM0_A3,name=NAME",
    `-o "${out}" format=topojson quantization=40000 force`,
  ].join(" "),
);
console.log(`wrote ${out} (${(statSync(out).size / 1024).toFixed(0)} KB)`);

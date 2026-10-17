import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { feature } from "topojson-client";
import type { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { cssVar } from "./theme";
import { t } from "./i18n";
// MapLibre finds its worker relative to its own module URL, which a bundler
// rewrites; point it at a copy that Vite emits with the build instead.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

maplibregl.setWorkerUrl(workerUrl);

interface CountryProps {
  ne: string;
  name: string;
  small: number;
}

export interface PaintSpec {
  /** Fill colour per Natural Earth code; null = no data (hatched). */
  color: (ne: string) => string | null;
  selected?: string | null;
  second?: string | null;
  focus?: string | null;
}

type HoverHandler = (ne: string | null, point: { x: number; y: number }) => void;

/** Flat world map: country polygons plus dots for microstates, coloured through feature-state. */
export class MapView {
  readonly map: maplibregl.Map;
  private ready: Promise<void>;
  private features: string[] = [];
  private smallDots: FeatureCollection<Point, CountryProps> = { type: "FeatureCollection", features: [] };
  private hovered: string | null = null;
  private hoverHandler: HoverHandler = () => {};
  private clickHandler: (ne: string) => void = () => {};
  private lastSpec: PaintSpec | null = null;

  constructor(container: HTMLElement, topo: Topology, labelPoint: (ne: string) => [number, number] | null) {
    const object = Object.values(topo.objects)[0] as GeometryCollection<CountryProps>;
    const countries = feature(topo, object) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryProps>;
    this.features = countries.features.map((f) => f.properties.ne);
    for (const f of countries.features) {
      const point = f.properties.small ? labelPoint(f.properties.ne) : null;
      if (point) {
        this.smallDots.features.push({ type: "Feature", properties: f.properties, geometry: { type: "Point", coordinates: point } });
      }
    }

    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "ocean", type: "background", paint: { "background-color": cssVar("--ocean") } }],
      },
      center: [12, 22],
      zoom: initialZoom(container),
      minZoom: -1,
      maxZoom: 7,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true, customAttribution: t("map.attribution") },
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.keyboard.disableRotation();
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    this.ready = new Promise((resolve) => {
      this.map.on("load", () => {
        this.addLayers(countries);
        resolve();
      });
    });
  }

  private addLayers(countries: FeatureCollection): void {
    const map = this.map;
    map.addImage("hatch", hatchPattern(), { pixelRatio: 2 });
    map.addSource("countries", { type: "geojson", data: countries, promoteId: "ne" });
    map.addSource("dots", { type: "geojson", data: this.smallDots, promoteId: "ne" });

    map.addLayer({ id: "nodata", type: "fill", source: "countries", paint: { "fill-pattern": "hatch" } });
    map.addLayer({
      id: "fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": ["coalesce", ["feature-state", "color"], "rgba(0,0,0,0)"],
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.82, 1],
      },
    });
    map.addLayer({
      id: "borders",
      type: "line",
      source: "countries",
      paint: { "line-color": cssVar("--land-stroke"), "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 5, 1.2] },
    });
    map.addLayer({
      id: "highlight",
      type: "line",
      source: "countries",
      paint: {
        "line-color": cssVar("--selected"),
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false], 2.2,
          ["boolean", ["feature-state", "focus"], false], 2.2,
          ["boolean", ["feature-state", "hover"], false], 1.4,
          0,
        ],
        "line-dasharray": [1, 0],
      },
    });
    map.addLayer({
      id: "dots",
      type: "circle",
      source: "dots",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 3.2, 5, 6],
        "circle-color": ["coalesce", ["feature-state", "color"], cssVar("--land-nodata")],
        "circle-stroke-color": [
          "case",
          ["any", ["boolean", ["feature-state", "selected"], false], ["boolean", ["feature-state", "focus"], false]],
          cssVar("--selected"),
          cssVar("--land-stroke"),
        ],
        "circle-stroke-width": [
          "case",
          ["any", ["boolean", ["feature-state", "selected"], false], ["boolean", ["feature-state", "hover"], false]],
          2,
          1,
        ],
      },
    });

    const neOf = (f: MapGeoJSONFeature | undefined) => (f?.properties?.ne as string | undefined) ?? null;
    const pick = (e: MapMouseEvent) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ["dots", "fill", "nodata"] });
      return neOf(hits[0]);
    };
    map.on("mousemove", (e: MapMouseEvent) => {
      const ne = pick(e);
      this.setHover(ne);
      map.getCanvas().style.cursor = ne ? "pointer" : "";
      this.hoverHandler(ne, e.point);
    });
    map.on("mouseout", () => {
      this.setHover(null);
      this.hoverHandler(null, { x: 0, y: 0 });
    });
    map.on("click", (e: MapMouseEvent) => {
      const ne = pick(e);
      if (ne) this.clickHandler(ne);
    });
  }

  private setState(ne: string, state: Record<string, unknown>): void {
    this.map.setFeatureState({ source: "countries", id: ne }, state);
    if (this.smallDots.features.some((f) => f.properties.ne === ne)) {
      this.map.setFeatureState({ source: "dots", id: ne }, state);
    }
  }

  private setHover(ne: string | null): void {
    if (ne === this.hovered) return;
    if (this.hovered) this.setState(this.hovered, { hover: false });
    this.hovered = ne;
    if (ne) this.setState(ne, { hover: true });
  }

  onHover(handler: HoverHandler): void {
    this.hoverHandler = handler;
  }

  onClick(handler: (ne: string) => void): void {
    this.clickHandler = handler;
  }

  async paint(spec: PaintSpec): Promise<void> {
    await this.ready;
    this.lastSpec = spec;
    for (const ne of this.features) {
      this.setState(ne, {
        color: spec.color(ne),
        selected: ne === spec.selected || ne === spec.second,
        focus: ne === spec.focus,
      });
    }
  }

  /** Re-read colour tokens after a theme switch. */
  async refreshTheme(): Promise<void> {
    await this.ready;
    const map = this.map;
    map.setPaintProperty("ocean", "background-color", cssVar("--ocean"));
    map.setPaintProperty("borders", "line-color", cssVar("--land-stroke"));
    map.setPaintProperty("highlight", "line-color", cssVar("--selected"));
    map.removeImage("hatch");
    map.addImage("hatch", hatchPattern(), { pixelRatio: 2 });
    map.setPaintProperty("dots", "circle-color", ["coalesce", ["feature-state", "color"], cssVar("--land-nodata")]);
    if (this.lastSpec) await this.paint(this.lastSpec);
  }

  async flyTo(points: [number, number][]): Promise<void> {
    await this.ready;
    if (!points.length) return;
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lons) - 8, Math.min(...lats) - 6],
      [Math.max(...lons) + 8, Math.max(...lats) + 6],
    ];
    this.map.fitBounds(bounds, { padding: 40, maxZoom: 4, duration: 600 });
  }

  /** Translate the attribution text after a language change. */
  setAttribution(text: string): void {
    const inner = this.map.getContainer().querySelector(".maplibregl-ctrl-attrib-inner");
    if (inner) inner.textContent = text;
  }

  resize(): void {
    this.map.resize();
  }

  get dotSource(): GeoJSONSource | undefined {
    return this.map.getSource("dots");
  }
}

function initialZoom(container: HTMLElement): number {
  const width = container.clientWidth || 800;
  return Math.max(-1, Math.log2(width / 512) + 0.05);
}

/** Diagonal hatching for "no data", in the current theme's colours. */
function hatchPattern(): ImageData {
  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = cssVar("--land-nodata");
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = cssVar("--muted");
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let o = -size; o <= size; o += 6) {
    ctx.moveTo(o, size);
    ctx.lineTo(o + size, 0);
  }
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

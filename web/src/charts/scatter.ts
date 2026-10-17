import { axisBottom, axisLeft } from "d3-axis";
import { extent } from "d3-array";
import { scaleLinear, scaleLog } from "d3-scale";
import { select } from "d3-selection";
import { t } from "../i18n";
import { escapeHtml } from "../format";

export interface ScatterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  labelled: boolean;
  tooltip: string;
}

export interface ScatterSpec {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  logX: boolean;
  fit: { slope: number; intercept: number } | null;
  selected: string | null;
  color: string;
  onPick: (id: string) => void;
}

/** Scatter with a least-squares line, labelled outliers and click-to-select. */
export function renderScatter(el: HTMLElement, spec: ScatterSpec): void {
  const width = Math.max(280, el.clientWidth || 340);
  const height = Math.round(width * 0.78);
  const m = { top: 12, right: 14, bottom: 36, left: 40 };
  const [x0, x1] = extent(spec.points, (p) => p.x) as [number, number];
  const [y0, y1] = extent(spec.points, (p) => p.y) as [number, number];
  const x = (spec.logX ? scaleLog().domain([x0 * 0.85, x1 * 1.15]) : scaleLinear().domain([x0 - 0.03, x1 + 0.03]))
    .range([m.left, width - m.right]);
  const y = scaleLinear().domain([Math.max(0, y0 - 8), y1 + 8]).nice().range([height - m.bottom, m.top]);

  el.innerHTML = "";
  el.classList.add("chart");
  const svg = select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
    .attr("role", "group").attr("aria-label", t("chart.against", { y: spec.yLabel, x: spec.xLabel }));

  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`)
    .call(axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)).tickFormat(() => ""));
  const xAxis = axisBottom(x).ticks(5).tickSizeOuter(0);
  if (spec.logX) {
    const [lo, hi] = x.domain();
    xAxis
      .tickValues([300, 1000, 3000, 10000, 30000, 100000].filter((v) => v >= lo && v <= hi))
      .tickFormat((d) => `$${Number(d) >= 1000 ? `${Number(d) / 1000}k` : d}`);
  }
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.bottom})`).call(xAxis);
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`).call(axisLeft(y).ticks(5).tickSizeOuter(0));
  svg.append("text").attr("class", "axis-label").attr("x", width - m.right).attr("y", height - 4).attr("text-anchor", "end").text(spec.xLabel);
  svg.append("text").attr("class", "axis-label").attr("x", m.left).attr("y", m.top - 2).text(spec.yLabel);

  if (spec.fit) {
    const fx = (v: number) => (spec.logX ? Math.log10(v) : v);
    const [a, b] = x.domain();
    const clipId = `clip-${Math.random().toString(36).slice(2)}`;
    svg.append("clipPath").attr("id", clipId).append("rect")
      .attr("x", m.left).attr("y", m.top).attr("width", width - m.left - m.right).attr("height", height - m.top - m.bottom);
    svg.append("line").attr("class", "fit").attr("clip-path", `url(#${clipId})`)
      .attr("x1", x(a)).attr("x2", x(b))
      .attr("y1", y(spec.fit.intercept + spec.fit.slope * fx(a))).attr("y2", y(spec.fit.intercept + spec.fit.slope * fx(b)));
  }

  const tip = select(el).append("div").attr("class", "chart-tip").style("display", "none");
  const ordered = [...spec.points].sort((p) => (p.id === spec.selected ? 1 : -1));
  svg.append("g").selectAll("circle").data(ordered).join("circle")
    .attr("class", (p) => (p.id === spec.selected ? "dot is-selected" : "dot"))
    .attr("cx", (p) => x(p.x)).attr("cy", (p) => y(p.y))
    .attr("r", (p) => (p.id === spec.selected ? 6 : 4))
    .attr("fill", spec.color)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (p) => `${p.label}: ${p.tooltip.replace(/<[^>]+>/g, " ")}`)
    .on("mouseenter focus", (event: Event, p) => {
      const target = event.currentTarget as SVGCircleElement;
      tip.style("display", null).style("left", `${Math.min(Number(target.getAttribute("cx")), width - 170)}px`)
        .style("top", `${Number(target.getAttribute("cy"))}px`)
        .html(`<strong>${escapeHtml(p.label)}</strong>${p.tooltip}`);
    })
    .on("mouseleave blur", () => tip.style("display", "none"))
    .on("click", (_e: Event, p) => spec.onPick(p.id))
    .on("keydown", (event: KeyboardEvent, p) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        spec.onPick(p.id);
      }
    });

  // Greedy label placement: the selected point first, then outliers; a label that
  // would overlap one already placed is skipped (outliers are also listed in text).
  const placed: { x0: number; x1: number; y: number }[] = [];
  const candidates = spec.points
    .filter((p) => p.labelled || p.id === spec.selected)
    .sort((a, b) => Number(b.id === spec.selected) - Number(a.id === spec.selected));
  const visible = candidates.filter((p) => {
    const w = p.label.length * 6;
    const right = x(p.x) > width - 90;
    const box = { x0: right ? x(p.x) - 7 - w : x(p.x) + 7, x1: right ? x(p.x) - 7 : x(p.x) + 7 + w, y: y(p.y) };
    if (placed.some((o) => Math.abs(o.y - box.y) < 12 && o.x0 < box.x1 && box.x0 < o.x1)) return false;
    placed.push(box);
    return true;
  });
  svg.append("g").selectAll("text").data(visible).join("text")
    .attr("class", (p) => (p.id === spec.selected ? "point-label is-selected" : "point-label"))
    .attr("x", (p) => x(p.x) + (x(p.x) > width - 90 ? -7 : 7))
    .attr("text-anchor", (p) => (x(p.x) > width - 90 ? "end" : "start"))
    .attr("y", (p) => y(p.y) + 4)
    .text((p) => p.label);
}

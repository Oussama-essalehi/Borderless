import { axisBottom, axisLeft } from "d3-axis";
import { max, min } from "d3-array";
import { scaleLinear, scaleUtc } from "d3-scale";
import { select } from "d3-selection";
import { line } from "d3-shape";
import { t } from "../i18n";
import { escapeHtml, formatDate } from "../format";
import type { EventInfo } from "../types";

export interface LineSeries {
  label: string;
  values: (number | null)[];
  color: string;
  dashed?: boolean;
}

export interface LineChartSpec {
  dates: string[];
  series: LineSeries[];
  current: string;
  events: EventInfo[];
  band?: { from: string; to: string; label: string };
  yLabel: string;
  onPick?: (date: string) => void;
}

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Score over time: thin lines, one y-axis, hover crosshair, click to jump to a snapshot. */
export function renderLineChart(el: HTMLElement, spec: LineChartSpec): void {
  const width = Math.max(260, el.clientWidth || 320);
  const height = 170;
  // Room on the right for the direct labels at the end of each line.
  const longest = Math.max(...spec.series.map((s) => s.label.length));
  const m = { top: 12, right: Math.min(130, 14 + longest * 6.2), bottom: 22, left: 34 };
  const x = scaleUtc()
    .domain([parse(spec.dates[0]), parse(spec.dates[spec.dates.length - 1])])
    .range([m.left, width - m.right]);
  const all = spec.series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const lo = min(all) ?? 0;
  const hi = max(all) ?? 1;
  const pad = Math.max(4, (hi - lo) * 0.12);
  const y = scaleLinear().domain([Math.max(0, lo - pad), hi + pad]).nice().range([height - m.bottom, m.top]);

  el.innerHTML = "";
  el.classList.add("chart");
  const svg = select(el)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("aria-label", t("chart.overTime", { y: spec.yLabel }));

  if (spec.band) {
    svg.append("rect")
      .attr("class", "band")
      .attr("x", x(parse(spec.band.from)))
      .attr("width", Math.max(0, x(parse(spec.band.to)) - x(parse(spec.band.from))))
      .attr("y", m.top)
      .attr("height", height - m.top - m.bottom)
      .append("title").text(spec.band.label);
    svg.append("text").attr("class", "band-label").attr("x", x(parse(spec.band.from)) + 4).attr("y", m.top + 10).text(spec.band.label);
  }

  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`)
    .call(axisLeft(y).ticks(4).tickSize(-(width - m.left - m.right)).tickFormat(() => ""));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.bottom})`)
    .call(axisBottom(x).ticks(Math.min(7, Math.floor(width / 60))).tickSizeOuter(0));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`).call(axisLeft(y).ticks(4).tickSizeOuter(0));

  for (const e of spec.events) {
    const ex = x(parse(e.date));
    if (ex < m.left || ex > width - m.right) continue;
    svg.append("line").attr("class", `event event-${e.kind}`).attr("x1", ex).attr("x2", ex).attr("y1", m.top).attr("y2", height - m.bottom)
      .append("title").text(`${formatDate(e.date)}: ${e.title}`);
  }

  const points = (s: LineSeries) => spec.dates.map((d, i) => [parse(d), s.values[i]] as const).filter((p): p is readonly [Date, number] => p[1] !== null);
  for (const s of spec.series) {
    const pts = points(s);
    svg.append("path")
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", s.dashed ? "4 3" : null)
      .attr("stroke-linejoin", "round")
      .attr("d", line<readonly [Date, number]>().x((p) => x(p[0])).y((p) => y(p[1]))(pts));
    const last = pts[pts.length - 1];
    if (last) {
      svg.append("text").attr("class", "direct-label").attr("x", x(last[0]) + 6).attr("y", y(last[1]) + 4).text(s.label);
    }
  }

  // Current snapshot marker on the first series.
  const ci = spec.dates.indexOf(spec.current);
  const cv = spec.series[0]?.values[ci];
  const cx = x(parse(spec.current));
  svg.append("line").attr("class", "current").attr("x1", cx).attr("x2", cx).attr("y1", m.top).attr("y2", height - m.bottom);
  if (cv !== null && cv !== undefined) {
    svg.append("circle").attr("cx", cx).attr("cy", y(cv)).attr("r", 4.5).attr("fill", spec.series[0].color).attr("stroke", "var(--surface)").attr("stroke-width", 2);
  }

  // Hover layer: crosshair + tooltip snapped to the nearest snapshot; click to open it.
  const tip = select(el).append("div").attr("class", "chart-tip").style("display", "none");
  const cross = svg.append("line").attr("class", "crosshair").attr("y1", m.top).attr("y2", height - m.bottom).style("display", "none");
  svg.append("rect")
    .attr("x", m.left).attr("y", m.top).attr("width", width - m.left - m.right).attr("height", height - m.top - m.bottom)
    .attr("fill", "transparent")
    .style("cursor", spec.onPick ? "pointer" : "default")
    .on("mousemove", (event: MouseEvent) => {
      const [mx] = [event.offsetX * (width / (el.querySelector("svg")!.clientWidth || width))];
      const target = x.invert(mx).getTime();
      let best = 0;
      spec.dates.forEach((d, i) => {
        if (Math.abs(parse(d).getTime() - target) < Math.abs(parse(spec.dates[best]).getTime() - target)) best = i;
      });
      const bx = x(parse(spec.dates[best]));
      cross.attr("x1", bx).attr("x2", bx).style("display", null);
      tip.style("display", null)
        .style("left", `${Math.min(bx, width - 150)}px`)
        .html(`<strong>${escapeHtml(formatDate(spec.dates[best]))}</strong>${spec.series
          .map((s) => `<div>${escapeHtml(s.label)}: ${s.values[best] ?? "–"}</div>`)
          .join("")}`);
      el.dataset.hover = spec.dates[best];
    })
    .on("mouseleave", () => {
      cross.style("display", "none");
      tip.style("display", "none");
    })
    .on("click", () => {
      if (spec.onPick && el.dataset.hover) spec.onPick(el.dataset.hover);
    });
}

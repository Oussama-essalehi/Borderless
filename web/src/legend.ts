import { CATEGORY_LABEL, CATEGORY_ORDER, categoryColor, escapeHtml, swatch } from "./format";

export interface LegendItem {
  color: string;
  label: string;
  key?: string;
}

export function renderLegend(el: HTMLElement, title: string, items: LegendItem[], opts: { noData?: boolean; onHover?: (key: string | null) => void } = {}): void {
  const rows = items
    .map((item) => {
      const inner = `${swatch(item.color)}<span>${escapeHtml(item.label)}</span>`;
      return opts.onHover && item.key
        ? `<li><button type="button" data-key="${escapeHtml(item.key)}">${inner}</button></li>`
        : `<li>${inner}</li>`;
    })
    .join("");
  const noData = opts.noData === false ? "" : `<li><span class="swatch hatch" aria-hidden="true"></span><span>No data</span></li>`;
  el.innerHTML = wrap(el, title, `<ul>${rows}${noData}</ul>`);
  if (opts.onHover) {
    const hover = opts.onHover;
    el.querySelectorAll<HTMLButtonElement>("button[data-key]").forEach((button) => {
      const key = button.dataset.key!;
      button.addEventListener("mouseenter", () => hover(key));
      button.addEventListener("focus", () => hover(key));
      button.addEventListener("mouseleave", () => hover(null));
      button.addEventListener("blur", () => hover(null));
    });
  }
}

export function accessLegend(el: HTMLElement, passportName: string): void {
  renderLegend(
    el,
    `Entry for ${passportName} passport holders`,
    [
      ...CATEGORY_ORDER.map((key) => ({ color: categoryColor(key), label: CATEGORY_LABEL[key] })),
      { color: categoryColor("home"), label: "Home country" },
    ],
  );
}

export function rampLegend(el: HTMLElement, title: string, colors: string[], low: string, high: string): void {
  el.innerHTML = wrap(el, title, `
    <div class="ramp" style="background:linear-gradient(90deg, ${colors.join(", ")})" aria-hidden="true"></div>
    <div class="ramp-labels"><span>${escapeHtml(low)}</span><span>${escapeHtml(high)}</span></div>
    <ul style="margin-top:4px"><li><span class="swatch hatch" aria-hidden="true"></span><span>No data</span></li></ul>`);
}

/** Collapsible box: open by default on wide screens, and it keeps the user's choice across re-renders. */
function wrap(el: HTMLElement, title: string, content: string): string {
  const previous = el.querySelector("details");
  const open = previous ? previous.open : !matchMedia("(max-width: 860px)").matches;
  return `<details${open ? " open" : ""}><summary><span class="legend-title">${escapeHtml(title)}</span></summary>${content}</details>`;
}

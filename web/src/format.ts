import type { Access, CategoryKey } from "./types";
import { cssVar } from "./theme";

export const CATEGORY_ORDER: CategoryKey[] = [
  "visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission",
];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  visa_free: "Visa-free",
  visa_on_arrival: "Visa on arrival",
  eta: "ETA",
  e_visa: "e-Visa",
  visa_required: "Visa required",
  no_admission: "No admission",
  home: "Home country",
};

export const DETAIL_LABEL: Record<string, string> = {
  covid_ban: "COVID-19 entry ban",
  hayya_entry_permit: "Hayya entry permit (World Cup 2022)",
  uk_electronic_visa_waiver: "UK electronic visa waiver",
  eta_or_e_visa: "ETA or e-visa (not distinguished before 2025)",
};

export function categoryColor(category: CategoryKey): string {
  return cssVar(`--c-${category}`);
}

export function describeAccess(access: Access): string {
  let text = CATEGORY_LABEL[access.category];
  if (access.category === "visa_free" && access.days) text += ` · up to ${access.days} days`;
  return text;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export function formatDate(iso: string, style: "long" | "short" = "long"): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: style === "long" ? "numeric" : undefined,
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function swatch(color: string, extraClass = ""): string {
  return `<span class="swatch ${extraClass}" style="background:${color}" aria-hidden="true"></span>`;
}

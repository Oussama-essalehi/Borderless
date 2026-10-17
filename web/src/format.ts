import type { Access, CategoryKey } from "./types";
import { lang, locale, t, type Key } from "./i18n";
import { cssVar } from "./theme";

export const CATEGORY_ORDER: CategoryKey[] = [
  "visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission",
];

export function categoryLabel(category: CategoryKey): string {
  return t(`cat.${category}` as Key);
}

export function detailLabel(detail: string | null): string | null {
  if (!detail) return null;
  const key = `detail.${detail}` as Key;
  const text = t(key);
  return text === key ? null : text;
}

export function categoryColor(category: CategoryKey): string {
  return cssVar(`--c-${category}`);
}

export function describeAccess(access: Access): string {
  let text = categoryLabel(access.category);
  if (access.category === "visa_free" && access.days) text += ` · ${t("cat.daysUpTo", { days: access.days })}`;
  return text;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export function formatDate(iso: string, style: "long" | "short" = "long"): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString(locale(), {
    day: style === "long" ? "numeric" : undefined,
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ordinal(n: number): string {
  if (lang() === "fr") return n === 1 ? "1er" : `${n}e`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function swatch(color: string, extraClass = ""): string {
  return `<span class="swatch ${extraClass}" style="background:${color}" aria-hidden="true"></span>`;
}

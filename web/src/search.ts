import type { App } from "./app";
import { escapeHtml } from "./format";

/** Native <datalist> search: keyboard accessible out of the box. Accepts English or French names and ISO-3 codes. */
export function setupSearch(app: App): void {
  const form = document.getElementById("search-form") as HTMLFormElement;
  const input = document.getElementById("search-input") as HTMLInputElement;
  const list = document.getElementById("passport-list") as HTMLDataListElement;

  app.onLangChange(() => {
    list.innerHTML = app.data.passports().map((c) => `<option value="${escapeHtml(app.data.name(c.iso3))}"></option>`).join("");
  });

  const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const resolve = (text: string) => {
    const q = fold(text);
    if (!q) return null;
    const passports = app.data.passports();
    const names = (c: (typeof passports)[number]) => [fold(c.name), fold(c.name_fr)];
    return (
      passports.find((c) => names(c).includes(q)) ??
      passports.find((c) => c.iso3.toLowerCase() === q) ??
      (q.length >= 3 ? passports.find((c) => names(c).some((n) => n.startsWith(q))) : undefined) ??
      null
    );
  };
  const pick = () => {
    const match = resolve(input.value);
    if (match) {
      app.selectPassport(match.iso3);
      input.value = "";
      input.blur();
    }
  };
  // Selecting an option from the list fires "input" with the full name.
  input.addEventListener("input", () => {
    if (app.data.passports().some((c) => app.data.name(c.iso3) === input.value)) pick();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    pick();
  });
}

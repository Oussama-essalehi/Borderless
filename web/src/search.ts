import type { App } from "./app";
import { escapeHtml } from "./format";

/** Native <datalist> search: keyboard accessible out of the box. */
export function setupSearch(app: App): void {
  const form = document.getElementById("search-form") as HTMLFormElement;
  const input = document.getElementById("search-input") as HTMLInputElement;
  const list = document.getElementById("passport-list") as HTMLDataListElement;
  const passports = app.data.passports();
  list.innerHTML = passports.map((c) => `<option value="${escapeHtml(c.name)}"></option>`).join("");

  const resolve = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return null;
    return (
      passports.find((c) => c.name.toLowerCase() === q) ??
      passports.find((c) => c.iso3.toLowerCase() === q) ??
      (q.length >= 3 ? passports.find((c) => c.name.toLowerCase().startsWith(q)) : undefined) ??
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
    if (passports.some((c) => c.name === input.value)) pick();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    pick();
  });
}

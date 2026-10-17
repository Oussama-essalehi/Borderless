import type { App } from "./app";
import { t, type Key, type Lang } from "./i18n";

/** Text that lives in index.html: title, description, labels, placeholders. */
export function applyPageText(): void {
  document.title = t("page.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("page.description"));
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as Key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria as Key));
  });
}

/** EN/FR button: shows the other language and switches to it. */
export function setupLangToggle(app: App, button: HTMLButtonElement): void {
  const render = (lang: Lang) => {
    const other: Lang = lang === "fr" ? "en" : "fr";
    button.textContent = t("lang.short");
    button.lang = other;
    button.setAttribute("aria-label", t("lang.switch"));
    button.title = t("lang.switch");
  };
  app.onLangChange((lang) => {
    applyPageText();
    render(lang);
  });
  button.addEventListener("click", () => app.store.set({ lang: app.store.state.lang === "fr" ? "en" : "fr" }));
}

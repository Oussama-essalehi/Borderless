import type { App } from "./app";
import { categoryColor, escapeHtml, formatDate, swatch } from "./format";
import { LANGS, t, type Lang } from "./i18n";

const SEEN_KEY = "borderless-welcome-seen";
const REPO_URL = "https://github.com/Oussama-essalehi/Borderless";

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode: the dialog simply shows again next time */
  }
}

/**
 * Project introduction, shown on the first visit and reopened with the "?" button
 * of the top bar. A native <dialog>: focus trapping, Escape and the backdrop come
 * from the browser.
 */
export function setupWelcome(app: App, openButton: HTMLButtonElement): { showIfFirstVisit: () => void } {
  const dialog = document.createElement("dialog");
  dialog.className = "welcome";
  dialog.setAttribute("aria-labelledby", "welcome-title");
  document.body.append(dialog);

  const close = () => {
    markSeen();
    if (dialog.open) dialog.close();
  };
  // Escape fires "cancel"; a click on the dimmed backdrop lands on the dialog element itself.
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  const render = (lang: Lang) => {
    const snaps = app.data.meta.snapshots;
    const latest = snaps[snaps.length - 1];
    const sw = (key: Parameters<typeof categoryColor>[0]) => swatch(categoryColor(key), "inline");
    // Translations contain trusted markup (emphasis) from i18n.ts only.
    dialog.innerHTML = `
      <div class="welcome-body">
        <div class="welcome-top">
          <div class="views welcome-lang" role="group" aria-label="Language / Langue">
            ${LANGS.map((l) => `<button type="button" lang="${l}" aria-pressed="${l === lang}" data-lang="${l}">${l.toUpperCase()}</button>`).join("")}
          </div>
          <button type="button" class="icon-button" data-close aria-label="${escapeHtml(t("about.close"))}">✕</button>
        </div>
        <h2 id="welcome-title" tabindex="-1">${escapeHtml(t("wel.title"))}</h2>
        <p class="welcome-lead">${escapeHtml(t("wel.intro", {
          passports: latest.passports,
          n: snaps.length,
          from: formatDate(snaps[0].date),
          to: formatDate(latest.date),
        }))}</p>

        <h3>${escapeHtml(t("wel.questionsTitle"))}</h3>
        <ul>
          <li>${escapeHtml(t("wel.q1"))}</li>
          <li>${escapeHtml(t("wel.q2"))}</li>
          <li>${escapeHtml(t("wel.q3"))}</li>
        </ul>

        <h3>${escapeHtml(t("wel.howTitle"))}</h3>
        <ul>
          <li>${t("wel.howClick")}</li>
          <li>${t("wel.howViews")}</li>
          <li>${t("wel.howTime")}</li>
          <li>${t("wel.howTabs")}</li>
        </ul>

        <h3>${escapeHtml(t("wel.readTitle"))}</h3>
        <p>${escapeHtml(t("wel.read"))
          .replace("{free}", sw("visa_free"))
          .replace("{voa}", sw("visa_on_arrival"))
          .replace("{eta}", sw("eta"))
          .replace("{evisa}", sw("e_visa"))
          .replace("{vr}", sw("visa_required"))
          .replace("{no}", sw("no_admission"))}</p>

        <h3>${escapeHtml(t("wel.dataTitle"))}</h3>
        <p>${escapeHtml(t("wel.data"))}</p>
        <p>${escapeHtml(t("wel.dataLimits"))}</p>
        <p>${escapeHtml(t("app.disclaimer"))}</p>

        <p class="welcome-author">${escapeHtml(t("wel.author"))}
          <a href="${REPO_URL}" target="_blank" rel="noopener">${escapeHtml(t("wel.code"))}</a></p>
      </div>
      <div class="welcome-actions">
        <button type="button" class="primary-button" data-close>${escapeHtml(t("wel.cta"))}</button>
      </div>`;
    dialog.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((b) => b.addEventListener("click", close));
    dialog.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
      b.addEventListener("click", () => app.store.set({ lang: b.dataset.lang as Lang })),
    );
    openButton.setAttribute("aria-label", t("wel.open"));
    openButton.title = t("wel.open");
  };

  app.onLangChange((lang) => {
    const wasOpen = dialog.open;
    render(lang);
    // Switching language from inside the dialog keeps it open with focus on the new choice.
    if (wasOpen) dialog.querySelector<HTMLButtonElement>(`[data-lang="${lang}"]`)?.focus();
  });

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    // Start at the top of the text (on a phone the button would otherwise scroll into view first).
    dialog.querySelector(".welcome-body")?.scrollTo({ top: 0 });
    dialog.querySelector<HTMLElement>("#welcome-title")?.focus({ preventScroll: true });
  };
  openButton.addEventListener("click", open);

  return {
    showIfFirstVisit: () => {
      if (!seen()) open();
    },
  };
}

import type { App } from "./app";
import { escapeHtml, formatDate } from "./format";
import { t } from "./i18n";

/** "About the data" dialog: sources, method and limitations, reachable from the footer. */
export function setupAbout(app: App): void {
  const dialog = document.createElement("dialog");
  dialog.className = "about";
  dialog.setAttribute("aria-labelledby", "about-title");
  document.body.append(dialog);

  const link = document.createElement("button");
  link.type = "button";
  link.className = "linklike";
  link.addEventListener("click", () => dialog.showModal());

  app.onLangChange(() => {
    const snaps = app.data.meta.snapshots;
    const sources = app.data.meta.sources
      .map((s) => `<li>${t("about.downloaded", { source: escapeHtml(s.source), date: escapeHtml(formatDate(s.downloaded_at.slice(0, 10))) })}</li>`)
      .join("");
    // Translations contain trusted markup (links, emphasis) from i18n.ts only.
    dialog.innerHTML = `
      <form method="dialog" class="about-close"><button class="icon-button" aria-label="${escapeHtml(t("about.close"))}">✕</button></form>
      <h2 id="about-title">${escapeHtml(t("about.title"))}</h2>
      <p>${escapeHtml(t("about.summary", {
        n: snaps.length,
        from: formatDate(snaps[0].date),
        to: formatDate(snaps[snaps.length - 1].date),
        passports: snaps[snaps.length - 1].passports,
      }))}</p>
      <h3>${escapeHtml(t("about.sources"))}</h3>
      <ul>
        <li>${t("about.srcVisa")}</li>
        <li>${escapeHtml(t("about.srcGdp"))}</li>
        <li>${escapeHtml(t("about.srcHdi"))}</li>
        <li>${escapeHtml(t("about.srcGeo"))}</li>
      </ul>
      <ul class="subtle">${sources}</ul>
      <h3>${escapeHtml(t("about.read"))}</h3>
      <ul>
        <li>${t("about.readScore")}</li>
        <li>${t("about.readRecip")}</li>
        <li>${t("about.readNetwork")}</li>
      </ul>
      <h3>${escapeHtml(t("about.limits"))}</h3>
      <ul>
        <li>${escapeHtml(t("about.limitConditional"))}</li>
        <li>${escapeHtml(t("about.limitSchengen"))}</li>
        <li>${escapeHtml(t("about.limitCategories"))}</li>
        <li>${escapeHtml(t("about.limitTerritories"))}</li>
        <li>${escapeHtml(t("about.limitGaps"))}</li>
      </ul>
      <p class="note">${escapeHtml(t("app.disclaimer"))}</p>`;
    link.textContent = t("about.link");
  });

  app.onRender(() => {
    const footer = document.getElementById("disclaimer")!;
    if (!footer.contains(link)) footer.append(link);
  });
}

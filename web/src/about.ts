import type { App } from "./app";
import { escapeHtml, formatDate } from "./format";

/** "About the data" dialog: sources, method and limitations, reachable from the footer. */
export function setupAbout(app: App): void {
  const dialog = document.createElement("dialog");
  dialog.className = "about";
  dialog.setAttribute("aria-labelledby", "about-title");
  const sources = app.data.meta.sources
    .map((s) => `<li><strong>${escapeHtml(s.source)}</strong>, downloaded ${escapeHtml(formatDate(s.downloaded_at.slice(0, 10)))}</li>`)
    .join("");
  const snaps = app.data.meta.snapshots;
  dialog.innerHTML = `
    <form method="dialog" class="about-close"><button class="icon-button" aria-label="Close">✕</button></form>
    <h2 id="about-title">About this data</h2>
    <p>${snaps.length} snapshots of visa requirements between ${escapeHtml(formatDate(snaps[0].date))} and
      ${escapeHtml(formatDate(snaps[snaps.length - 1].date))}, for ${snaps[snaps.length - 1].passports} passports.</p>
    <h3>Sources</h3>
    <ul>
      <li>Visa requirements: <a href="https://github.com/ilyankou/passport-index-dataset">Passport Index dataset</a> (2019–2025) and
        its successor <a href="https://github.com/imorte/passport-index-data">passport-index-data</a> (2026–), MIT licence,
        scraped from passportindex.org.</li>
      <li>GDP per capita: World Bank (NY.GDP.PCAP.CD), CC BY 4.0.</li>
      <li>Human Development Index: UNDP Human Development Report, CC BY 3.0 IGO.</li>
      <li>Boundaries: Natural Earth 1:50m, public domain. Borders follow Natural Earth's defaults and imply no position.</li>
    </ul>
    <ul class="subtle">${sources}</ul>
    <h3>How to read it</h3>
    <ul>
      <li><strong>Visa-free score</strong>: destinations reachable visa-free or with a visa on arrival. ETAs are kept separate.</li>
      <li><strong>Reciprocity</strong> compares four tiers: visa-free/on arrival, ETA, e-visa, visa required/no admission.</li>
      <li><strong>Network metrics</strong> weight each passport→destination edge by ease of entry (1.0 visa-free down to 0.1 visa required).</li>
    </ul>
    <h3>Limitations</h3>
    <ul>
      <li>One category per pair can't express conditional access (e.g. visa-free with a valid US or Schengen visa,
        only by air, only for tourism). The map shows the general rule.</li>
      <li>Schengen stays are counted across the whole area: 90 days in any 180, not per country.</li>
      <li>ETAs are only a separate category from 12 January 2025; before that they are counted as e-visas.
        2019 snapshots have no day counts.</li>
      <li>Territories missing from the visa data or the boundaries (for example Western Sahara, Northern Cyprus, Somaliland,
        overseas territories) are shown as "no data".</li>
      <li>Snapshots are irregular, with gaps in mid-2020 and between January 2025 and February 2026.</li>
    </ul>
    <p class="note">Visa rules change often. Always check the destination's official government source before travelling.</p>`;
  document.body.append(dialog);

  const link = document.createElement("button");
  link.type = "button";
  link.className = "linklike";
  link.textContent = "About the data";
  link.addEventListener("click", () => dialog.showModal());
  app.onRender(() => {
    const footer = document.getElementById("disclaimer")!;
    if (!footer.contains(link)) footer.append(link);
  });
}

import type { ViewDef } from "../app";
import { escapeHtml, swatch } from "../format";
import { blocShort, t } from "../i18n";
import { renderLegend } from "../legend";
import { communityLabel, communitySlot, loadNetwork, type NetworkFile } from "../network";
import { cssVar } from "../theme";

let data: NetworkFile | null = null;
let byIso = new Map<string, number | null>();
let highlighted: number | null = null;

export function highlightCommunity(id: number | null): void {
  highlighted = id;
}

export const communityView: ViewDef = {
  id: "community",
  label: () => t("view.community"),
  async prepare() {
    if (!data) {
      data = await loadNetwork();
      byIso = new Map(data.countries.map((c) => [c.iso3, c.community_id]));
    }
  },
  color(_app, iso3) {
    if (!byIso.has(iso3)) return null;
    const id = byIso.get(iso3)!;
    if (highlighted !== null && id !== highlighted) return cssVar("--hairline");
    return cssVar(communitySlot(id));
  },
  tooltip(app, iso3) {
    const id = byIso.get(iso3);
    const community = data?.communities.find((c) => c.community_id === id);
    const name = escapeHtml(app.data.name(iso3));
    if (!community) return `<strong>${name}</strong>${escapeHtml(t("community.none"))}`;
    const blocs = community.blocs.map((b) => blocShort(b.code)).join(", ");
    return `<strong>${name}</strong>
      <div class="row">${swatch(cssVar(communitySlot(community.community_id)))}${escapeHtml(communityLabel(community))}</div>
      <div class="hint">${escapeHtml(t("insights.countries", { n: community.size }))}${blocs ? ` · ${escapeHtml(t("community.tipContains", { blocs }))}` : ""}</div>`;
  },
  legend(app, el) {
    if (!data) return;
    renderLegend(
      el,
      t("legend.blocs", { year: data.snapshot_date.slice(0, 4) }),
      data.communities.map((c) => ({
        key: String(c.community_id),
        color: cssVar(communitySlot(c.community_id)),
        label: `${communityLabel(c)} (${c.size})`,
      })),
      {
        onHover: (key) => {
          highlightCommunity(key === null ? null : Number(key));
          void app.render();
        },
      },
    );
  },
};

export function communityData(): NetworkFile | null {
  return data;
}

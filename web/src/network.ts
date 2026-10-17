import { fetchJson } from "./data";

export interface NetworkCountry {
  iso3: string;
  passport_power: number;
  openness: number;
  pagerank: number;
  free_out: number;
  free_in: number;
  community_id: number | null;
}

export interface Community {
  community_id: number;
  label: string;
  size: number;
  top_subregion: string;
  blocs: { code: string; name: string; share_of_bloc: number }[];
}

export interface NetworkFile {
  snapshot_date: string;
  method: {
    edge_weights: Record<string, number>;
    louvain_resolution: number;
    min_split_modularity: number;
  };
  countries: NetworkCountry[];
  communities: Community[];
}

let network: Promise<NetworkFile> | null = null;

export function loadNetwork(): Promise<NetworkFile> {
  network ??= fetchJson<NetworkFile>("network.json");
  return network;
}

// Slot order for communities 0-7: the categorical palette, with slots 7 and 8
// swapped so neighbouring Central and Southern African blocs don't get red next
// to orange.
const SLOTS = [1, 2, 3, 4, 5, 6, 8, 7];

/** Categorical slot per community: the eight largest get a colour, the rest share "other". */
export function communitySlot(id: number | null): string {
  return id !== null && id < SLOTS.length ? `--s-${SLOTS[id]}` : "--s-other";
}

export type CategoryKey =
  | "visa_free"
  | "visa_on_arrival"
  | "eta"
  | "e_visa"
  | "visa_required"
  | "no_admission"
  | "home";

export interface CategoryInfo {
  key: CategoryKey;
  label: string;
  description: string;
}

export interface SnapshotInfo {
  date: string;
  file: string;
  source: string;
  value_format: "numeric_code" | "short_code" | "label";
  eta_is_distinct: boolean;
  source_changed: boolean;
  passports: number;
  covid_ban_pairs: number;
  eta_pairs: number;
}

export interface EventInfo {
  date: string;
  kind: "covid" | "eta" | "policy" | "methodology";
  title: string;
  description: string;
  title_fr: string;
  description_fr: string;
}

export interface Meta {
  snapshot_date: string;
  generated_at: string;
  categories: CategoryInfo[];
  cell_codes: Record<string, { category: CategoryKey; detail: string | null }>;
  snapshots: SnapshotInfo[];
  events: EventInfo[];
  sources: { source: string; url: string | string[]; downloaded_at: string }[];
}

export interface Country {
  iso3: string;
  name: string;
  name_fr: string;
  region: string | null;
  subregion: string | null;
  ne: string | null;
  schengen: boolean;
  blocs: string[];
  income: string | null;
  lon: number | null;
  lat: number | null;
  visa_data: boolean;
  gdp: number | null;
  gdp_year: number | null;
  hdi: number | null;
  hdi_year: number | null;
}

export interface SnapshotFile {
  snapshot_date: string;
  codes: string[];
  rows: string[];
  days: number[][];
}

export interface ScoresFile {
  snapshot_date: string;
  dates: string[];
  passports: Record<string, { score: (number | null)[]; rank: (number | null)[]; mobility: (number | null)[] }>;
}

export interface Access {
  category: CategoryKey;
  days: number | null;
  detail: string | null;
}

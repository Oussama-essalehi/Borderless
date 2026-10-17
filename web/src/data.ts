import { lang, locale } from "./i18n";
import { Matrix } from "./matrix";
import type { Country, Meta, ScoresFile, SnapshotFile } from "./types";

const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const request = fetch(BASE + path).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
      return res.json();
    });
    request.catch(() => cache.delete(path));
    cache.set(path, request);
  }
  return cache.get(path) as Promise<T>;
}

export class DataStore {
  private matrices = new Map<string, Promise<Matrix>>();
  readonly byIso = new Map<string, Country>();
  readonly byNe = new Map<string, Country>();

  constructor(
    readonly meta: Meta,
    readonly countries: Country[],
    readonly scores: ScoresFile,
  ) {
    for (const c of countries) {
      this.byIso.set(c.iso3, c);
      if (c.ne) this.byNe.set(c.ne, c);
    }
  }

  static async load(): Promise<DataStore> {
    const [meta, countries, scores] = await Promise.all([
      fetchJson<Meta>("meta.json"),
      fetchJson<{ countries: Country[] }>("countries.json"),
      fetchJson<ScoresFile>("scores.json"),
    ]);
    return new DataStore(meta, countries.countries, scores);
  }

  get latestDate(): string {
    return this.meta.snapshot_date;
  }

  /** Snapshots other than the one in view are only fetched when asked for. */
  matrix(date: string): Promise<Matrix> {
    const snap = this.meta.snapshots.find((s) => s.date === date);
    if (!snap) return Promise.reject(new Error(`Unknown snapshot ${date}`));
    if (!this.matrices.has(date)) {
      this.matrices.set(
        date,
        fetchJson<SnapshotFile>(snap.file).then((file) => new Matrix(file, this.meta.cell_codes)),
      );
    }
    return this.matrices.get(date)!;
  }

  /** Country name in the current language. */
  name(iso3: string | null | undefined): string {
    if (!iso3) return "";
    const country = this.byIso.get(iso3);
    if (!country) return iso3;
    return lang() === "fr" ? country.name_fr || country.name : country.name;
  }

  /** Compare two ISO-3 codes by their name in the current language. */
  byName = (a: string, b: string): number => this.name(a).localeCompare(this.name(b), locale());

  /** Countries that hold passports in the visa data, sorted by name. */
  passports(): Country[] {
    return this.countries.filter((c) => c.visa_data).sort((a, b) => this.byName(a.iso3, b.iso3));
  }

  rank(iso3: string, date: string): { score: number | null; rank: number | null; of: number } {
    const i = this.scores.dates.indexOf(date);
    const entry = this.scores.passports[iso3];
    const of = this.meta.snapshots.find((s) => s.date === date)?.passports ?? 0;
    if (i < 0 || !entry) return { score: null, rank: null, of };
    return { score: entry.score[i], rank: entry.rank[i], of };
  }
}

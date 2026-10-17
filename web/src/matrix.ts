import type { Access, CategoryKey, Meta, SnapshotFile } from "./types";

/** Decoded passport x destination matrix for one snapshot. */
export class Matrix {
  readonly date: string;
  readonly codes: string[];
  private readonly index = new Map<string, number>();
  private readonly rows: string[];
  // days[i][j] for every cell (0 when unknown or not visa-free)
  private readonly dayGrid: Uint16Array[];
  private readonly codeMeaning: Meta["cell_codes"];

  constructor(file: SnapshotFile, codeMeaning: Meta["cell_codes"]) {
    this.date = file.snapshot_date;
    this.codes = file.codes;
    this.rows = file.rows;
    this.codeMeaning = codeMeaning;
    file.codes.forEach((c, i) => this.index.set(c, i));
    this.dayGrid = file.rows.map((row, i) => {
      const grid = new Uint16Array(row.length);
      const days = file.days[i] ?? [];
      let k = 0;
      for (let j = 0; j < row.length; j++) {
        if (codeMeaning[row[j]]?.category === "visa_free") grid[j] = days[k++] ?? 0;
      }
      return grid;
    });
  }

  has(iso3: string): boolean {
    return this.index.has(iso3);
  }

  /** What holders of `passport` get when visiting `destination`. */
  get(passport: string, destination: string): Access | null {
    const i = this.index.get(passport);
    const j = this.index.get(destination);
    if (i === undefined || j === undefined) return null;
    const meaning = this.codeMeaning[this.rows[i][j]];
    if (!meaning) return null;
    const days = this.dayGrid[i][j];
    return { category: meaning.category, days: days || null, detail: meaning.detail };
  }

  /** Category counts for one passport (home excluded). */
  counts(passport: string): Record<CategoryKey, number> {
    const counts: Record<CategoryKey, number> = {
      visa_free: 0, visa_on_arrival: 0, eta: 0, e_visa: 0, visa_required: 0, no_admission: 0, home: 0,
    };
    const i = this.index.get(passport);
    if (i === undefined) return counts;
    for (const ch of this.rows[i]) {
      const cat = this.codeMeaning[ch]?.category;
      if (cat) counts[cat]++;
    }
    return counts;
  }

  /** Visa-free score: visa-free + visa on arrival destinations. */
  score(passport: string): number {
    const c = this.counts(passport);
    return c.visa_free + c.visa_on_arrival;
  }
}

export const EASE: Record<CategoryKey, number> = {
  visa_free: 6, visa_on_arrival: 5, eta: 4, e_visa: 3, visa_required: 2, no_admission: 1, home: 7,
};

/** Reciprocity tiers, same as the dbt reciprocity mart. */
export function tier(category: CategoryKey): number {
  switch (category) {
    case "visa_free":
    case "visa_on_arrival":
      return 4;
    case "eta":
      return 3;
    case "e_visa":
      return 2;
    default:
      return 1;
  }
}

export type Relation = "symmetric" | "favorable" | "unfavorable";

/** Compare what A's citizens get in B with what B's citizens get in A. */
export function relation(outbound: CategoryKey, inbound: CategoryKey): Relation {
  const gap = tier(outbound) - tier(inbound);
  return gap === 0 ? "symmetric" : gap > 0 ? "favorable" : "unfavorable";
}

/** Best of two passports for one destination. */
export function bestOf(a: Access | null, b: Access | null): { access: Access | null; from: "first" | "second" | "both" | null } {
  if (!a && !b) return { access: null, from: null };
  if (!b) return { access: a, from: "first" };
  if (!a) return { access: b, from: "second" };
  const ea = EASE[a.category], eb = EASE[b.category];
  if (ea > eb) return { access: a, from: "first" };
  if (eb > ea) return { access: b, from: "second" };
  // Same category: the longer known stay wins.
  if ((b.days ?? 0) > (a.days ?? 0)) return { access: b, from: "second" };
  return { access: a, from: "both" };
}

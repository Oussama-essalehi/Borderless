import { relation, type Matrix, type Relation } from "./matrix";

export interface Fairness {
  iso3: string;
  partners: number;
  symmetric: number;
  favorable: number;
  unfavorable: number;
  /** Share of symmetric relationships, 0-100 (one decimal). */
  fairness: number;
  /** (favourable - unfavourable) / partners, -1..1 (three decimals). */
  balance: number;
  rank: number;
}

/** Same definition as the dbt fairness_scores mart, computed for any snapshot. */
export function fairnessScores(matrix: Matrix): Fairness[] {
  const rows: Omit<Fairness, "rank">[] = matrix.codes.map((a) => {
    let symmetric = 0, favorable = 0, unfavorable = 0;
    for (const b of matrix.codes) {
      if (a === b) continue;
      const out = matrix.get(a, b);
      const back = matrix.get(b, a);
      if (!out || !back) continue;
      const rel = relation(out.category, back.category);
      if (rel === "symmetric") symmetric++;
      else if (rel === "favorable") favorable++;
      else unfavorable++;
    }
    const partners = symmetric + favorable + unfavorable;
    return {
      iso3: a,
      partners,
      symmetric,
      favorable,
      unfavorable,
      fairness: partners ? Math.round((1000 * symmetric) / partners) / 10 : 0,
      balance: partners ? Math.round((1000 * (favorable - unfavorable)) / partners) / 1000 : 0,
    };
  });
  // Rank by number of symmetric partners, ties share a rank (like SQL rank()).
  const sorted = [...rows].sort((x, y) => y.symmetric - x.symmetric);
  const ranks = new Map<string, number>();
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    ranks.set(row.iso3, prev && prev.symmetric === row.symmetric ? ranks.get(prev.iso3)! : i + 1);
  });
  return rows.map((r) => ({ ...r, rank: ranks.get(r.iso3)! }));
}

export function pairRelation(matrix: Matrix, country: string, partner: string): { relation: Relation; out: ReturnType<Matrix["get"]>; back: ReturnType<Matrix["get"]> } | null {
  const out = matrix.get(country, partner);
  const back = matrix.get(partner, country);
  if (!out || !back || country === partner) return null;
  return { relation: relation(out.category, back.category), out, back };
}

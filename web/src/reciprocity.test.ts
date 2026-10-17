import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Matrix } from "./matrix";
import { fairnessScores } from "./reciprocity";
import type { Meta, SnapshotFile } from "./types";

const data = (path: string) => JSON.parse(readFileSync(new URL(`../public/data/${path}`, import.meta.url), "utf8"));

describe("fairness scores", () => {
  it("match the dbt fairness_scores mart for the latest snapshot", () => {
    const meta: Meta = data("meta.json");
    const latest = meta.snapshots.at(-1)!;
    const matrix = new Matrix(data(latest.file) as SnapshotFile, meta.cell_codes);
    const fromDbt: { countries: { iso3: string; fairness_score: number; reciprocity_balance: number; n_symmetric: number; fairness_rank: number }[] } =
      data("fairness.json");
    const computed = new Map(fairnessScores(matrix).map((f) => [f.iso3, f]));
    expect(computed.size).toBe(fromDbt.countries.length);
    for (const row of fromDbt.countries) {
      const mine = computed.get(row.iso3)!;
      expect(mine.symmetric, row.iso3).toBe(row.n_symmetric);
      expect(mine.fairness, row.iso3).toBeCloseTo(row.fairness_score, 1);
      expect(mine.balance, row.iso3).toBeCloseTo(row.reciprocity_balance, 3);
      expect(mine.rank, row.iso3).toBe(row.fairness_rank);
    }
  });
});

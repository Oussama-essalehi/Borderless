import { describe, expect, it } from "vitest";
import { Matrix, bestOf, relation, tier } from "./matrix";
import type { Meta, SnapshotFile } from "./types";

const codes: Meta["cell_codes"] = {
  F: { category: "visa_free", detail: null },
  A: { category: "visa_on_arrival", detail: null },
  T: { category: "eta", detail: null },
  E: { category: "e_visa", detail: null },
  V: { category: "visa_required", detail: null },
  C: { category: "no_admission", detail: "covid_ban" },
  H: { category: "home", detail: null },
};

const file: SnapshotFile = {
  snapshot_date: "2026-02-18",
  codes: ["AAA", "BBB", "CCC"],
  rows: ["HFV", "THF", "CAH"],
  days: [[90], [180], []],
};

describe("Matrix", () => {
  const m = new Matrix(file, codes);

  it("decodes categories and the days of visa-free cells", () => {
    expect(m.get("AAA", "BBB")).toEqual({ category: "visa_free", days: 90, detail: null });
    expect(m.get("BBB", "CCC")).toEqual({ category: "visa_free", days: 180, detail: null });
    expect(m.get("AAA", "CCC")).toEqual({ category: "visa_required", days: null, detail: null });
    expect(m.get("CCC", "AAA")).toEqual({ category: "no_admission", days: null, detail: "covid_ban" });
  });

  it("returns null for unknown countries", () => {
    expect(m.get("AAA", "ZZZ")).toBeNull();
    expect(m.has("ZZZ")).toBe(false);
  });

  it("counts categories and the visa-free score", () => {
    expect(m.counts("CCC")).toMatchObject({ no_admission: 1, visa_on_arrival: 1, home: 1 });
    expect(m.score("BBB")).toBe(1);
    expect(m.score("CCC")).toBe(1);
  });
});

describe("reciprocity", () => {
  it("compares tiers, treating visa-free and on arrival alike", () => {
    expect(tier("visa_free")).toBe(tier("visa_on_arrival"));
    expect(relation("visa_free", "visa_on_arrival")).toBe("symmetric");
    expect(relation("visa_required", "visa_free")).toBe("unfavorable");
    expect(relation("eta", "e_visa")).toBe("favorable");
  });
});

describe("bestOf", () => {
  const free90 = { category: "visa_free" as const, days: 90, detail: null };
  const free30 = { category: "visa_free" as const, days: 30, detail: null };
  const visa = { category: "visa_required" as const, days: null, detail: null };

  it("keeps the easier access and says which passport gives it", () => {
    expect(bestOf(visa, free30)).toEqual({ access: free30, from: "second" });
    expect(bestOf(free30, visa)).toEqual({ access: free30, from: "first" });
    expect(bestOf(free30, free90)).toEqual({ access: free90, from: "second" });
    expect(bestOf(free90, free90).from).toBe("both");
    expect(bestOf(null, null)).toEqual({ access: null, from: null });
  });
});

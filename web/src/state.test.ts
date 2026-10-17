import { describe, expect, it } from "vitest";
import { parseUrl, toSearch, type AppState } from "./state";

const defaults: AppState = { passport: null, second: null, date: "2026-02-18", view: "access", tab: "passport", focus: null, lang: "en" };
const known = (iso: string) => ["FRA", "DEU", "MAR"].includes(iso);
const dates = ["2025-01-12", "2026-02-18"];

describe("URL state", () => {
  it("reads a shareable passport link", () => {
    expect(parseUrl("?passport=fra", defaults, known, dates).passport).toBe("FRA");
  });

  it("ignores unknown codes, views and dates", () => {
    const s = parseUrl("?passport=XYZ&view=nope&date=1999-01-01&tab=zzz", defaults, known, dates);
    expect(s).toEqual(defaults);
  });

  it("round-trips non-default values", () => {
    const s: AppState = { ...defaults, passport: "MAR", second: "FRA", view: "combo", date: "2025-01-12", tab: "trips", lang: "fr" };
    expect(parseUrl(toSearch(s, "2026-02-18"), defaults, known, dates)).toEqual(s);
  });

  it("keeps the default view out of the URL but always states the language", () => {
    expect(toSearch({ ...defaults, passport: "FRA" }, "2026-02-18")).toBe("?passport=FRA&lang=en");
  });

  it("reads the language", () => {
    expect(parseUrl("?lang=fr", defaults, known, dates).lang).toBe("fr");
    expect(parseUrl("?lang=de", defaults, known, dates).lang).toBe("en");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { colon, dictionaries, percent, plural, regionName, blocShort, t } from "./i18n";
import * as i18n from "./i18n";
import { ordinal } from "./format";

// setLang touches document/localStorage; set the module's language directly through it with light stubs.
function use(lang: "en" | "fr") {
  (globalThis as Record<string, unknown>).document ??= { documentElement: {} };
  i18n.setLang(lang);
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  afterEach(() => use("en"));

  it("cover the same keys in English and French, with no empty text", () => {
    const en = Object.keys(dictionaries.en).sort();
    const fr = Object.keys(dictionaries.fr).sort();
    expect(fr).toEqual(en);
    for (const key of en) {
      expect(dictionaries.fr[key as keyof typeof dictionaries.fr].trim(), key).not.toBe("");
    }
  });

  it("use placeholders that the code fills in", () => {
    // French may drop a placeholder it can't phrase naturally, but never invent one.
    for (const [key, text] of Object.entries(dictionaries.fr)) {
      const english = new Set(placeholders(dictionaries.en[key as keyof typeof dictionaries.en]));
      for (const name of placeholders(text)) expect(english.has(name), `${key}: {${name}}`).toBe(true);
    }
  });

  it("switch language for text, plurals, ordinals and numbers", () => {
    use("fr");
    expect(t("view.access")).toBe("Accès");
    expect(t("insights.countries", { n: 12 })).toBe("12 pays");
    expect(plural(0)).toBe("");
    expect(plural(2)).toBe("s");
    expect(ordinal(1)).toBe("1er");
    expect(ordinal(8)).toBe("8e");
    expect(percent(76.8, 1)).toBe("76,8 %");
    expect(colon()).toBe(" : ");
    expect(regionName("Western Africa")).toBe("Afrique de l'Ouest");
    expect(blocShort("ECOWAS")).toBe("CEDEAO");
    use("en");
    expect(plural(0)).toBe("s");
    expect(ordinal(22)).toBe("22nd");
    expect(percent(76.8, 1)).toBe("76.8%");
  });
});

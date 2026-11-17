import { describe, expect, it } from "vitest";
import { lookupAbbreviation } from "@/lib/abbreviations";
import { segmentCompound } from "@/lib/compounds";
import { interpretLookup, participleLemma, pickLookup, spellingVariants, zuInfinitiveLemma } from "@/lib/lookup-interpret";
import { assembleLookup, extractFormReferences, extractRestFormReferences, readRedirects, selectPage } from "@/lib/lookup";
import { parseOpenSearch, parseWikiSummary, readLookupCache, writeLookupCache, type LookupResponse } from "@/lib/lookup-client";

const AUSZUSPRECHEN_DE = `
== auszusprechen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Erweiterter Infinitiv|Deutsch}} ===
{{Grammatische Merkmale}}
*erweiterter Infinitiv Aktiv des Verbs '''[[aussprechen]]'''
{{Grundformverweis Konj|aussprechen}}
`;

const GING_DE = `
== ging ({{Sprache|Deutsch}}) ==
=== {{Wortart|Konjugierte Form|Deutsch}} ===
{{Grammatische Merkmale}}
*1. Person Singular Indikativ Präteritum Aktiv des Verbs '''[[gehen]]'''
*3. Person Singular Indikativ Präteritum Aktiv des Verbs '''[[gehen]]'''
{{Grundformverweis Konj|gehen}}
`;

const PATIENTEN_DE = `
== Patienten ({{Sprache|Deutsch}}) ==
=== {{Wortart|Deklinierte Form|Deutsch}} ===
{{Grammatische Merkmale}}
*Nominativ Plural des Substantivs '''[[Patient]]'''
*Genitiv Singular des Substantivs '''[[Patient]]'''
{{Grundformverweis Dekl|Patient}}
`;

const AUSZUSPRECHEN_EN = `
==German==
===Verb===
{{head|de|verb form}}
# {{de-zu-infinitive of|aussprechen}}
`;

const GING_EN = `
==German==
===Verb===
{{head|de|verb form}}
# {{verb form of|de|gehen||1//3|s|pret}}
`;

function memoryStore() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("inflected lookup", () => {
  it("resolves zu-infinitives, participles, and irregular verbs to the lemma", () => {
    expect(zuInfinitiveLemma("auszusprechen")).toBe("aussprechen");
    expect(zuInfinitiveLemma("abzuholen")).toBe("abholen");
    expect(zuInfinitiveLemma("anzurufen")).toBe("anrufen");
    expect(participleLemma("ausgesprochen")).toBe("aussprechen");
    expect(participleLemma("abgeholt")).toBe("abholen");

    expect(interpretLookup("auszusprechen")?.note).toBe("auszusprechen → aussprechen, zu-infinitive");
    expect(interpretLookup("abzuholen")?.note).toBe("abzuholen → abholen, zu-infinitive");
    expect(interpretLookup("zu sprechen")?.note).toBe("zu sprechen → sprechen, zu-infinitive");
    expect(interpretLookup("ausgesprochen")?.note).toBe("ausgesprochen → aussprechen, past participle");
    expect(interpretLookup("ging")?.note).toBe("ging → gehen, preterite");
    expect(interpretLookup("sprach")?.note).toBe("sprach → sprechen, preterite");
    expect(interpretLookup("hilft")?.note).toBe("hilft → helfen, present");
    expect(interpretLookup("gegangen")?.note).toBe("gegangen → gehen, past participle");
    expect(interpretLookup("abgeholt")?.note).toBe("abgeholt → abholen, past participle");

    const ambiguous = interpretLookup("ausgesprochen");
    expect(ambiguous?.priority).toBe("low");
    const kept = pickLookup(
      ambiguous!,
      new Map([
        ["ausgesprochen", "ausgesprochen"],
        ["aussprechen", "aussprechen"],
      ]),
    );
    expect(kept.type).toBe("entry");
    if (kept.type === "entry") {
      expect(kept.key).toBe("ausgesprochen");
      expect(kept.suggestions?.[0]).toMatchObject({ lemma: "aussprechen", label: "past participle" });
    }
    const onlyVerb = pickLookup(ambiguous!, new Map([["aussprechen", "aussprechen"]]));
    expect(onlyVerb.type === "entry" && onlyVerb.interpretation).toBe("ausgesprochen → aussprechen, past participle");
  });

  it("shows the base verb for a bare stem and resolves a split separable phrase", () => {
    const hole = interpretLookup("hole");
    expect(hole?.note).toBe("hole → holen, present");
    expect(hole?.hints).toEqual(expect.arrayContaining(["abholen"]));
    const kommt = interpretLookup("kommt");
    expect(kommt?.lemma).toBe("kommen");
    expect(kommt?.hints).toEqual(expect.arrayContaining(["ankommen", "mitkommen"]));
    const rufe = interpretLookup("rufe");
    expect(rufe?.lemma).toBe("rufen");
    expect(rufe?.hints).toEqual(expect.arrayContaining(["anrufen"]));
    expect(interpretLookup("hole ab")?.note).toBe("hole ab → abholen, separable verb");
    expect(interpretLookup("ich hole dich ab")?.note).toBe("ich hole dich ab → abholen, separable verb");
  });

  it("resolves noun plurals and case endings", () => {
    expect(interpretLookup("Patienten")?.note).toBe("Patienten → Patient, plural");
    expect(interpretLookup("Ärzten")?.note).toBe("Ärzten → Arzt, dative plural");
    expect(interpretLookup("des Arztes")?.note).toBe("des Arztes → Arzt, genitive");
    expect(interpretLookup("patienten")?.lemma).toBe("Patient");
  });

  it("resolves adjective endings, comparatives, and superlatives", () => {
    expect(interpretLookup("kleinen")?.note).toBe("kleinen → klein, adjective ending");
    expect(interpretLookup("akuter")?.note).toBe("akuter → akut, comparative");
    expect(interpretLookup("schnellste")?.note).toBe("schnellste → schnell, superlative");
    expect(interpretLookup("am schnellsten")?.note).toBe("am schnellsten → schnell, superlative");
  });

  it("splits long compounds, including a Fugen consonant", () => {
    const device = segmentCompound("Blutdruckmessgerät");
    expect(device?.parts.map((part) => part.word)).toEqual(["Blutdruck", "Messgerät"]);
    expect(device?.guess).toBe("blood pressure measuring device");
    expect(interpretLookup("Blutdruckmessgerät")?.note).toBe("Blutdruckmessgerät → Blutdruck + Messgerät, compound");

    const dose = segmentCompound("Schmerzmittelgabe");
    expect(dose?.parts.map((part) => part.word)).toEqual(["Schmerzmittel", "Gabe"]);
    expect(dose?.guess).toBe("pain medication administration");
    expect(interpretLookup("Schmerzmittelgabe")?.kind).toBe("compound");

    expect(segmentCompound("Patientenakte")?.parts.map((part) => part.word)).toEqual(["Patient", "Akte"]);
  });

  it("reads clinical abbreviations before any online lookup", () => {
    expect(lookupAbbreviation("RR")).toMatchObject({ expansion: "Riva-Rocci", en: "blood pressure" });
    expect(interpretLookup("RR")?.kind).toBe("abbreviation");
    expect(interpretLookup("RR")?.note).toBe("RR → Riva-Rocci, blood pressure");
    expect(interpretLookup("i.v.")?.note).toMatch(/intravenös/);
    expect(interpretLookup("IV")?.abbreviation?.canonical).toBe("i.v.");
    expect(interpretLookup("EKG")?.abbreviation?.en).toMatch(/ECG/);
    expect(interpretLookup("Z.n.")?.abbreviation?.expansion).toMatch(/Zustand nach/);
    expect(interpretLookup("nüchtern")?.kind).toBe("abbreviation");
    expect(interpretLookup("NPO")?.abbreviation?.en).toMatch(/nothing by mouth/);
    expect(lookupAbbreviation("ob")).toBeNull();
    expect(lookupAbbreviation("o.B.")?.expansion).toMatch(/Befund/);
    expect(interpretLookup("RR")?.seeds).toEqual([]);
  });

  it("keeps a phrase together, then the content words", () => {
    expect(interpretLookup("Bescheid sagen")?.note).toBe("Bescheid sagen → Bescheid + sagen, phrase");
    expect(interpretLookup("Bescheid sagen")?.keywords).toEqual(["Bescheid", "sagen"]);
    const phrase = pickLookup(interpretLookup("Bescheid sagen")!, new Map([
      ["bescheid sagen", "Bescheid sagen"],
      ["bescheid", "Bescheid"],
      ["sagen", "sagen"],
    ]));
    expect(phrase.type).toBe("phrase");
    if (phrase.type === "phrase") {
      expect(phrase.interpretation).toBe("Bescheid sagen → Bescheid + sagen, phrase");
      expect(phrase.keys).toEqual(["Bescheid sagen", "Bescheid", "sagen"]);
    }
    expect(selectPage([{ title: "Gehen" }, { title: "gehen" }], "gehen")?.title).toBe("gehen");
    expect(selectPage([{ title: "Gehen" }, { title: "gehen" }], "Gehen")?.title).toBe("Gehen");
    expect(selectPage([{ title: "Übergabe", aliases: ["Ubergabe"] }], "Ubergabe")?.title).toBe("Übergabe");
    expect(interpretLookup("sich einwaschen")?.note).toBe("sich einwaschen → einwaschen, reflexive");
    expect(interpretLookup("zur Kenntnis nehmen")?.note).toBe("zur Kenntnis nehmen → Kenntnis + nehmen, phrase");
    expect(interpretLookup("zur Kenntnis nehmen")?.keywords).toEqual(["Kenntnis", "nehmen"]);
  });

  it("accepts ae/oe/ue/ss and a missing umlaut", () => {
    expect(spellingVariants("Ubergabe")).toEqual([{ lemma: "Übergabe", label: "missing umlaut" }]);
    expect(interpretLookup("Ubergabe")?.note).toBe("Ubergabe → Übergabe, missing umlaut");
    expect(spellingVariants("hole")).toEqual([]);
    expect(spellingVariants("Krankenhau")).toEqual([]);
    expect(interpretLookup("nehmen")?.kind).toBe("direct");
    expect(interpretLookup("einwaschen")?.lemma).toBeUndefined();
    expect(interpretLookup("i.v.")?.note).toBe("i.v. → intravenös, intravenous");
    expect(spellingVariants("Strasse")).toEqual([{ lemma: "Straße", label: "spelling" }]);
    expect(spellingVariants("fuer")[0]?.lemma).toBe("für");
    expect(spellingVariants("aerzte")[0]?.lemma).toBe("ärzte");
    const plan = interpretLookup("Ubergabe");
    const picked = pickLookup(plan!, new Map([["übergabe", "Übergabe"]]));
    expect(picked.type === "entry" && picked.interpretation).toBe("Ubergabe → Übergabe, missing umlaut");
  });

  it("reads Wiktionary form-of links and ignores them as meanings", () => {
    expect(extractFormReferences(AUSZUSPRECHEN_DE, "de")).toEqual([{ lemma: "aussprechen", label: "zu-infinitive" }]);
    expect(extractFormReferences(GING_DE, "de")).toEqual([{ lemma: "gehen", label: "preterite" }]);
    expect(extractFormReferences(PATIENTEN_DE, "de")[0]).toMatchObject({ lemma: "Patient" });
    expect(extractFormReferences(AUSZUSPRECHEN_EN, "en")).toEqual([{ lemma: "aussprechen", label: "zu-infinitive" }]);
    expect(extractFormReferences(GING_EN, "en")).toEqual([{ lemma: "gehen", label: "preterite" }]);
    expect(assembleLookup({ title: "auszusprechen", deWikitext: AUSZUSPRECHEN_DE, enWikitext: AUSZUSPRECHEN_EN })).toBeNull();
    expect(assembleLookup({ title: "ging", deWikitext: GING_DE })).toBeNull();

    const rest = {
      de: [
        {
          partOfSpeech: "Verb",
          language: "German",
          definitions: [
            {
              definition:
                '<span class="form-of-definition">zu-infinitive of <a href="/wiki/aussprechen#German">aussprechen</a></span>',
            },
          ],
        },
      ],
    };
    expect(extractRestFormReferences(rest)).toEqual([{ lemma: "aussprechen", label: "zu-infinitive" }]);
    expect(assembleLookup({ title: "auszusprechen", restDefinition: rest })).toBeNull();
    expect(readRedirects({ query: { redirects: [{ from: "Strasse", to: "Straße" }] } })).toEqual([
      { from: "Strasse", to: "Straße" },
    ]);
  });

  it("parses fuzzy suggestions, Wikipedia summaries, and the session cache", () => {
    expect(parseOpenSearch(["krank", ["Krankenhaus", "krank"], [], []])).toEqual(["Krankenhaus", "krank"]);
    expect(parseOpenSearch(null)).toEqual([]);
    expect(
      parseWikiSummary({
        type: "standard",
        title: "Thomapyrin",
        description: "Arzneimittel",
        extract: "Thomapyrin ist ein Schmerzmittel.",
      }),
    ).toMatchObject({ title: "Thomapyrin", description: "Arzneimittel" });
    expect(parseWikiSummary({ type: "disambiguation", title: "Aspirin", extract: "…" })).toBeNull();

    const store = memoryStore();
    const response: LookupResponse = {
      ok: true,
      card: { title: "gehen", partial: false, senses: [], interpretation: "ging → gehen, preterite" },
    };
    writeLookupCache(store, "ging", response);
    expect(readLookupCache(store, "ging")?.ok).toBe(true);
    expect(readLookupCache(store, "missing")).toBeNull();
    expect(readLookupCache({ getItem: () => "{" }, "ging")).toBeNull();
  });
});

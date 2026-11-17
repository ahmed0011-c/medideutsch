import { describe, expect, it } from "vitest";
import {
  applyPlural,
  assembleLookup,
  chooseGermanPage,
  findSavedEntry,
  lookupToDraft,
  normalizeQuery,
  parseMyMemory,
  readRevisionPages,
} from "@/lib/lookup";
import { emptyWortbank, isWortbankDoc, reviewQueue, upsertWortbank, type WortbankEntry } from "@/lib/wortbank";

const HUND_DE = `
{{Siehe auch|[[hund]]}}
== hund ({{Sprache|Dänisch}}) ==
{{Ü|en|WRONG}}
== Hund ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{m}} ===

{{Deutsch Substantiv Übersicht
|Genus=m
|Nominativ Singular=Hund
|Nominativ Plural=Hunde
|Genitiv Singular=Hundes
}}

{{Aussprache}}
:{{IPA}} {{Lautschrift|hʊnt}}
:{{Hörbeispiele}} {{Audio|De-at-Hund.ogg|spr=at}}, {{Audio|De-Hund.ogg}}

{{Bedeutungen}}
:[1] [[Haustier]], dessen Vorfahre der [[Wolf]] ist

{{Beispiele}}
:[1] Der ''Hund'' bellt laut.
:[1] Ein gemeiner Hund sitzt vor der Tür.

{{Wortbildungen}}
:[[Hundehütte]], [[hundemüde]]

==== {{Übersetzungen}} ====
*{{en}}: [1] {{Ü|en|dog}}, {{Ü|en|hound}}

== Hund ({{Sprache|Englisch}}) ==
{{Ü|en|SHOULD-NOT-APPEAR}}
`;

const ABHOLEN_DE = `
== abholen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===

{{Deutsch Verb Übersicht
|Präsens_ich=hole ab
|Präsens_du=holst ab
|Präteritum_ich=holte ab
|Partizip II=abgeholt
|Hilfsverb=haben
}}

{{Aussprache}}
:{{IPA}} {{Lautschrift|ˈapˌhoːlən}}
:{{Hörbeispiele}} {{Audio|De-abholen.ogg}}

{{Beispiele}}
:[1] Ich muss noch ein Paket von der Post ''abholen.''
:[2] Kannst du mich morgen vom Bahnhof ''abholen?''

{{Wortbildungen}}
:[[Abholung]], [[Abholer]]

==== {{Übersetzungen}} ====
*{{en}}: {{Ü|en|pick up}}, {{Ü|en|collect}}
`;

const VERSTEHEN_DE = `
== verstehen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===
{{Deutsch Verb Übersicht
|Präsens_ich=verstehe
|Präteritum_ich=verstand
|Partizip II=verstanden
|Hilfsverb=haben
}}
{{Aussprache}}
:{{IPA}} {{Lautschrift|fɛɐ̯ˈʃteːən}}
`;

const GEHEN_DE = `
== gehen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===
{{Deutsch Verb Übersicht
|Präsens_ich=gehe
|Präteritum_ich=ging
|Partizip II=gegangen
|Hilfsverb=sein
}}
`;

const KRANKENHAUS_EN = `
==German==

===Pronunciation===
* {{IPA|de|/ˈkʁaŋkn̩ˌhaʊ̯s/|/ˈkʁaŋkŋ̍ˌhaʊ̯s/}}
* {{audio|de|De-at-Krankenhaus.ogg|a=Austria}}
* {{audio|de|De-Krankenhaus.ogg}}

===Noun===
{{de-noun|n,,^er|dim=^chen}}

# [[hospital]]

====Derived terms====
* {{l|de|Kreiskrankenhaus}}

==English==
# not this
`;

const ABHOLEN_EN = `
==German==
===Pronunciation===
* {{IPA|de|/ˈʔaphoːlən/}}
===Verb===
{{de-verb|ab.holen}}
# to [[collect]], to [[pick up]]
#: {{uxi|de|Mama '''holt''' mich von der Schule '''ab'''.|Mom '''picks''' me '''up''' from school.}}
====Derived terms====
* {{l|de|Abholung}}
`;

const VERSTEHEN_EN = `
==German==
===Verb===
{{de-verb|verstehen<verstand,verstanden>}}
# to [[understand]]
`;

const GEHEN_EN = `
==German==
===Verb===
{{de-verb|gehen<ging,gegangen.sein>}}
# to [[go]], to [[walk]]
`;

const HUND_REST = {
  de: [
    {
      partOfSpeech: "Noun",
      language: "German",
      definitions: [
        {
          definition:
            '<span class="usage-label-sense"></span> <a rel="mw:WikiLink" href="/wiki/dog" title="dog">dog</a>, <a href="/wiki/hound">hound</a>',
          parsedExamples: [{ example: "ein gemeiner <b>Hund</b>", translation: "a mean <b>dog</b>" }],
        },
        { definition: "A board with <a href=\"/wiki/caster\">casters</a> used to transport heavy objects." },
      ],
    },
  ],
  other: [{ partOfSpeech: "Noun", language: "Danish", definitions: [{ definition: "should be ignored" }] }],
};

describe("lookup response parsing", () => {
  it("reads a MediaWiki revision payload and skips missing pages", () => {
    const pages = readRevisionPages({
      query: {
        pages: [
          { pageid: -1, missing: true, title: "hund" },
          {
            pageid: 12,
            title: "Hund",
            revisions: [{ slots: { main: { content: HUND_DE } } }],
          },
        ],
      },
    });
    expect(pages.map((page) => page.title)).toEqual(["hund", "Hund"]);
    expect(pages[0]?.wikitext).toBeNull();
    const chosen = chooseGermanPage(pages, "hund", "de");
    expect(chosen?.title).toBe("Hund");
    expect(readRevisionPages(null)).toEqual([]);
    expect(readRevisionPages({ query: {} })).toEqual([]);
  });

  it("parses a German noun: article, plural, IPA, audio, English, example", () => {
    const card = assembleLookup({ title: "Hund", deWikitext: HUND_DE, restDefinition: HUND_REST });
    expect(card?.partial).toBe(false);
    const sense = card?.senses[0];
    expect(sense?.pos).toBe("noun");
    expect(sense?.articles).toEqual(["der"]);
    expect(sense?.plural).toBe("Hunde");
    expect(sense?.ipa).toBe("/hʊnt/");
    expect(sense?.audio).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/De-Hund.ogg");
    expect(sense?.meanings.slice(0, 2)).toEqual(["dog", "hound"]);
    expect(sense?.meanings).toContain("A board with casters used to transport heavy objects.");
    expect(sense?.meanings).not.toContain("WRONG");
    expect(sense?.meanings).not.toContain("SHOULD-NOT-APPEAR");
    expect(sense?.examples[0]).toEqual({ de: "ein gemeiner Hund", en: "a mean dog" });
    expect(sense?.related).toEqual(expect.arrayContaining(["Hundehütte"]));
    expect(sense?.enSource).toBe("wiktionary");
  });

  it("parses separable, inseparable, and sein verbs", () => {
    const abholen = assembleLookup({ title: "abholen", deWikitext: ABHOLEN_DE })?.senses[0];
    expect(abholen?.separable).toBe(true);
    expect(abholen?.inseparable).toBe(false);
    expect(abholen?.prefix).toBe("ab");
    expect(abholen?.praeteritum).toBe("holte ab");
    expect(abholen?.partizip).toBe("abgeholt");
    expect(abholen?.aux).toBe("haben");
    expect(abholen?.meanings).toEqual(["pick up", "collect"]);
    expect(lookupToDraft(abholen!).de).toBe("ab|holen");

    const verstehen = assembleLookup({ title: "verstehen", deWikitext: VERSTEHEN_DE })?.senses[0];
    expect(verstehen?.separable).toBe(false);
    expect(verstehen?.inseparable).toBe(true);
    expect(verstehen?.praeteritum).toBe("verstand");
    expect(verstehen?.partizip).toBe("verstanden");
    expect(verstehen?.aux).toBe("haben");

    const gehen = assembleLookup({ title: "gehen", deWikitext: GEHEN_DE })?.senses[0];
    expect(gehen?.separable).toBe(false);
    expect(gehen?.inseparable).toBe(false);
    expect(gehen?.praeteritum).toBe("ging");
    expect(gehen?.partizip).toBe("gegangen");
    expect(gehen?.aux).toBe("sein");
  });

  it("builds noun plurals and verb forms from the English Wiktionary headword", () => {
    expect(applyPlural("Krankenhaus", "^er")).toBe("Krankenhäuser");
    expect(applyPlural("Arzt", "^e")).toBe("Ärzte");
    expect(applyPlural("Apfel", "^")).toBe("Äpfel");
    expect(applyPlural("Mädchen", "-:s[nonstandard, uncommon]")).toBe("Mädchen");
    expect(applyPlural("Hund", "e:^e[regionally]")).toBe("Hunde");
    expect(applyPlural("Tablette", "n")).toBe("Tabletten");

    const hospital = assembleLookup({ title: "Krankenhaus", enWikitext: KRANKENHAUS_EN })?.senses[0];
    expect(hospital?.articles).toEqual(["das"]);
    expect(hospital?.plural).toBe("Krankenhäuser");
    expect(hospital?.ipa).toBe("/ˈkʁaŋkn̩ˌhaʊ̯s/");
    expect(hospital?.audio).toContain("De-Krankenhaus.ogg");
    expect(hospital?.meanings).toEqual(["hospital"]);
    expect(hospital?.related).toContain("Kreiskrankenhaus");

    const separable = assembleLookup({ title: "abholen", enWikitext: ABHOLEN_EN })?.senses[0];
    expect(separable?.separable).toBe(true);
    expect(separable?.prefix).toBe("ab");
    expect(separable?.meanings[0]).toBe("to collect, to pick up");
    expect(separable?.examples[0]?.en).toMatch(/picks/);
    expect(separable?.related).toContain("Abholung");
    const verstehen = assembleLookup({ title: "verstehen", enWikitext: VERSTEHEN_EN })?.senses[0];
    expect(verstehen?.inseparable).toBe(true);
    expect(verstehen?.praeteritum).toBe("verstand");
    expect(verstehen?.partizip).toBe("verstanden");
    const gehen = assembleLookup({ title: "gehen", enWikitext: GEHEN_EN })?.senses[0];
    expect(gehen?.aux).toBe("sein");
    expect(gehen?.praeteritum).toBe("ging");
    expect(gehen?.partizip).toBe("gegangen");
    expect(gehen?.separable).toBe(false);
    expect(gehen?.inseparable).toBe(false);
  });

  it("asks MyMemory only when Wiktionary has no English sense", () => {
    expect(parseMyMemory({ responseStatus: 200, responseData: { translatedText: "Hospital" }, responseDetails: "" })).toBe(
      "Hospital",
    );
    expect(
      parseMyMemory({
        responseStatus: 200,
        responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" },
      }),
    ).toBeNull();
    expect(parseMyMemory({ responseStatus: 429, responseDetails: "quota", responseData: {} })).toBeNull();
    expect(parseMyMemory(null)).toBeNull();

    const withEnglish = assembleLookup({
      title: "Hund",
      deWikitext: HUND_DE,
      translation: "should not replace",
    });
    expect(withEnglish?.senses[0]?.enSource).toBe("wiktionary");
    expect(withEnglish?.senses[0]?.meanings).not.toContain("should not replace");

    const bare = `
== Zwinge ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{f}} ===
{{Deutsch Substantiv Übersicht
|Genus=f
|Nominativ Plural=Zwingen
}}
{{Bedeutungen}}
:[1] ein Werkzeug zum Festklemmen
`;
    const translated = assembleLookup({ title: "Zwinge", deWikitext: bare, translation: "clamp" });
    expect(translated?.senses[0]?.articles).toEqual(["die"]);
    expect(translated?.senses[0]?.plural).toBe("Zwingen");
    expect(translated?.senses[0]?.meanings).toEqual(["clamp"]);
    expect(translated?.senses[0]?.enSource).toBe("mymemory");
    expect(translated?.senses[0]?.germanGloss).toMatch(/Werkzeug/);

    const onlyTranslation = assembleLookup({ title: "Wort", translation: "word" });
    expect(onlyTranslation?.partial).toBe(true);
    expect(onlyTranslation?.senses[0]?.meanings).toEqual(["word"]);
    expect(assembleLookup({ title: "Wort" })).toBeNull();

    const noisy = assembleLookup({
      title: "gehen",
      restDefinition: {
        de: [
          {
            partOfSpeech: "Verb",
            language: "German",
            definitions: [
              { definition: "to go" },
              { definition: "nominative/accusative/genitive plural of Tablett" },
              {
                definition:
                  "to be all right .mw-parser-output .object-usage-tag{font-style:italic}[with dative]",
              },
            ],
          },
        ],
      },
      deWikitext: `
== gehen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===
{{Wortbildungen}}
:[[Adjektiv]], [[Gang]]
`,
    });
    expect(noisy?.senses[0]?.meanings).toEqual(["to go", "to be all right"]);
    expect(noisy?.senses[0]?.related).toEqual(["Gang"]);
  });

  it("saves a lookup into the Wortbank without disturbing an older word", () => {
    expect(normalizeQuery("  der Hund? ")).toBe("Hund");
    expect(normalizeQuery("")).toBeNull();
    const legacy: WortbankEntry = {
      id: "lesson:spritze",
      lessonId: "lesson",
      lessonTitle: "Articles",
      lessonKind: "grammar",
      key: "spritze",
      surface: "Spritze",
      lemma: "Spritze",
      pos: "noun",
      de: "Spritze",
      en: "syringe",
      emoji: "💉",
      sentence: "Die Spritze ist bereit.",
      href: "/learn/a1/artikel",
      hard: true,
      story: "a story",
      savedAt: "2026-01-01T00:00:00.000Z",
      due: "2026-01-01T00:00:00.000Z",
      intervalDays: 4,
      ease: 2.5,
      reps: 2,
    };
    const doc = { version: 1 as const, entries: [legacy] };
    expect(isWortbankDoc(doc)).toBe(true);

    const sense = assembleLookup({ title: "abholen", deWikitext: ABHOLEN_DE })!.senses[0]!;
    expect(findSavedEntry(doc.entries, { lemma: "Spritze", pos: "noun" })?.id).toBe(legacy.id);
    expect(findSavedEntry(doc.entries, sense)).toBeUndefined();
    expect(findSavedEntry([{ ...legacy, lemma: "die Tablette", de: "die Tablette" }], { lemma: "Tablette", pos: "noun" })).toBeTruthy();

    const saved = upsertWortbank(doc, lookupToDraft(sense), new Date("2026-04-01T08:00:00.000Z"));
    expect(saved.entries).toHaveLength(2);
    const kept = saved.entries.find((entry) => entry.id === legacy.id);
    expect(kept?.hard).toBe(true);
    expect(kept?.story).toBe("a story");
    expect(kept?.ipa).toBeUndefined();
    const lookup = saved.entries.find((entry) => entry.lessonKind === "lookup");
    expect(lookup?.source).toBe("Lookup");
    expect(lookup?.href).toBe("/nachschlagen");
    expect(lookup?.de).toBe("ab|holen");
    expect(lookup?.separable).toBe(true);
    expect(lookup?.praeteritum).toBe("holte ab");
    expect(isWortbankDoc(saved)).toBe(true);
    const queue = reviewQueue(saved.entries, { now: new Date("2026-04-02T08:00:00.000Z") });
    expect(queue.map((entry) => entry.id)).toContain(lookup?.id);
    expect(emptyWortbank().entries).toEqual([]);
  });
});

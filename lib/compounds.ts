export type CompoundPart = { word: string; en: string };

export type CompoundSplit = {
  parts: CompoundPart[];
  guess: string;
};

type Stem = { key: string; word: string; en: string };

/** Medical and everyday pieces, longest match first at runtime. */
const STEMS: Stem[] = [
  ["blutdruck", "Blutdruck", "blood pressure"],
  ["messgerät", "Messgerät", "measuring device"],
  ["schmerzmittel", "Schmerzmittel", "pain medication"],
  ["krankenhaus", "Krankenhaus", "hospital"],
  ["medikament", "Medikament", "medication"],
  ["infusion", "Infusion", "infusion"],
  ["katheter", "Katheter", "catheter"],
  ["verband", "Verband", "dressing"],
  ["spritze", "Spritze", "syringe"],
  ["tablette", "Tablette", "tablet"],
  ["patient", "Patient", "patient"],
  ["akte", "Akte", "record"],
  ["station", "Station", "ward"],
  ["schwester", "Schwester", "nurse"],
  ["therapie", "Therapie", "therapy"],
  ["klinik", "Klinik", "clinic"],
  ["notfall", "Notfall", "emergency"],
  ["aufnahme", "Aufnahme", "admission"],
  ["befund", "Befund", "finding"],
  ["blut", "Blut", "blood"],
  ["druck", "Druck", "pressure"],
  ["mess", "Mess", "measuring"],
  ["messung", "Messung", "measurement"],
  ["gerät", "Gerät", "device"],
  ["schmerz", "Schmerz", "pain"],
  ["mittel", "Mittel", "agent"],
  ["gabe", "Gabe", "administration"],
  ["herz", "Herz", "heart"],
  ["infarkt", "Infarkt", "infarct"],
  ["lunge", "Lunge", "lung"],
  ["niere", "Niere", "kidney"],
  ["leber", "Leber", "liver"],
  ["magen", "Magen", "stomach"],
  ["darm", "Darm", "intestine"],
  ["kopf", "Kopf", "head"],
  ["brust", "Brust", "chest"],
  ["bauch", "Bauch", "abdomen"],
  ["rücken", "Rücken", "back"],
  ["knochen", "Knochen", "bone"],
  ["gelenk", "Gelenk", "joint"],
  ["muskel", "Muskel", "muscle"],
  ["nerv", "Nerv", "nerve"],
  ["gefäß", "Gefäß", "vessel"],
  ["wunde", "Wunde", "wound"],
  ["fieber", "Fieber", "fever"],
  ["husten", "Husten", "cough"],
  ["atem", "Atem", "breath"],
  ["pflege", "Pflege", "care"],
  ["dosis", "Dosis", "dose"],
  ["salbe", "Salbe", "ointment"],
  ["tropfen", "Tropfen", "drops"],
  ["kapsel", "Kapsel", "capsule"],
  ["labor", "Labor", "lab"],
  ["wert", "Wert", "value"],
  ["zeit", "Zeit", "time"],
  ["arzt", "Arzt", "doctor"],
  ["haus", "Haus", "house"],
  ["krank", "Krank", "sick"],
].map(([key, word, en]) => ({ key, word, en }));

const BY_LENGTH = [...STEMS].sort((a, b) => b.key.length - a.key.length);
const FUGEN = ["ens", "en", "er", "es", "ns", "e", "n", "s"];

/**
 * Split a long compound into known pieces.
 * Fugen -s, -n, -en, -er, -e, -es, -ens, -ns may sit between pieces.
 * Returns null unless at least two pieces cover the whole word.
 */
export function segmentCompound(input: string): CompoundSplit | null {
  const word = input.trim();
  if (word.length < 10 || /\s/.test(word)) return null;
  const lower = word.toLocaleLowerCase("de");
  const memo = new Map<number, CompoundPart[] | null>();

  function from(index: number): CompoundPart[] | null {
    if (index === lower.length) return [];
    if (memo.has(index)) return memo.get(index) ?? null;
    let best: CompoundPart[] | null = null;
    const starts = [index];
    if (index > 0) {
      for (const fugen of FUGEN) {
        if (lower.startsWith(fugen, index) && index + fugen.length < lower.length) starts.push(index + fugen.length);
      }
    }
    for (const start of starts) {
      for (const stem of BY_LENGTH) {
        if (!lower.startsWith(stem.key, start)) continue;
        const end = start + stem.key.length;
        const rest = from(end);
        if (!rest) continue;
        const parts = [{ word: stem.word, en: stem.en }, ...rest];
        if (!best || parts.length < best.length) best = parts;
      }
    }
    memo.set(index, best);
    return best;
  }

  const parts = from(0);
  if (!parts || parts.length < 2) return null;
  return { parts, guess: parts.map((part) => part.en).join(" ") };
}

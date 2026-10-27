import familyFile from "@/content/families.json";
import mnemonicFile from "@/content/mnemonics.json";

export type FamilyForm = {
  form: string;
  pos: string;
  en: string;
};

export type WordFamily = {
  id: string;
  lemmas: string[];
  forms: FamilyForm[];
};

export type Mnemonic = {
  emoji: string;
  story: string;
};

const FAMILIES = familyFile as WordFamily[];
const MNEMONICS = mnemonicFile as Record<string, Mnemonic>;

function keyOf(lemma: string): string {
  return lemma
    .toLowerCase()
    .replace(/^(der|die|das)\s+/, "")
    .trim();
}

export function familyFor(lemma: string): WordFamily | null {
  const key = keyOf(lemma);
  return FAMILIES.find((family) => family.lemmas.some((item) => item.toLowerCase() === key)) ?? null;
}

export function mnemonicFor(lemma: string): Mnemonic | null {
  return MNEMONICS[keyOf(lemma)] ?? null;
}

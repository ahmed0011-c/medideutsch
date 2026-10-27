export type PrefixNote = {
  prefix: string;
  meaning: string;
  mnemonic: string;
};

/** Stress sits on these prefixes, and in a main clause they jump to the end. */
export const SEPARABLE_PREFIXES: PrefixNote[] = [
  { prefix: "ab", meaning: "off, away, down", mnemonic: "ab leaves the body: Blut abnehmen, den Verband abnehmen." },
  { prefix: "an", meaning: "on, at, towards", mnemonic: "an reaches towards someone or a start: die Station anrufen, die Visite fängt an." },
  { prefix: "auf", meaning: "up, open", mnemonic: "auf is up or open: um 6 Uhr aufstehen, den Patienten aufklären." },
  { prefix: "aus", meaning: "out", mnemonic: "aus goes out: langsam ausatmen, sich nach der Visite ausruhen." },
  { prefix: "ein", meaning: "in", mnemonic: "ein goes in: tief einatmen, die Tablette einnehmen, den Wert eintragen." },
  { prefix: "mit", meaning: "along, with", mnemonic: "mit means you go too: Kommen Sie zur Sono mit." },
  { prefix: "vor", meaning: "before, forward", mnemonic: "vor happens beforehand: die Spritze vorbereiten, sich vorstellen." },
  { prefix: "zu", meaning: "closed, towards", mnemonic: "zu shuts or aims: den Mund zumachen, dem Patienten zuhören." },
  { prefix: "zurück", meaning: "back", mnemonic: "zurück returns to the start: ins Zimmer zurückkommen, den Befund zurückgeben." },
  { prefix: "weg", meaning: "away", mnemonic: "weg is gone from here: der Schmerz geht weg, das Tablett wegnehmen." },
  { prefix: "fern", meaning: "far", mnemonic: "fern is far from the ward round: abends fernsehen." },
  { prefix: "frei", meaning: "clear", mnemonic: "frei clears the skin: den Oberkörper freimachen." },
  { prefix: "hoch", meaning: "up", mnemonic: "hoch lifts onto the bed: das Bein hochlegen." },
  { prefix: "weh", meaning: "pain", mnemonic: "weh is the ache itself: die Wade tut weh." },
  {
    prefix: "wieder",
    meaning: "again",
    mnemonic: "wiederkommen stresses WIEDER and splits. wiederholen stresses holen, stays in one piece, and means repeat.",
  },
];

export const INSEPARABLE_PREFIXES: Array<{ prefix: string; examples: string }> = [
  { prefix: "be-", examples: "bekommen, besuchen, benutzen" },
  { prefix: "ver-", examples: "verstehen, verbinden, vermuten" },
  { prefix: "ent-", examples: "entlassen, entstehen" },
  { prefix: "er-", examples: "erklären, erzählen, erfragen" },
  { prefix: "ge-", examples: "gehören, gewinnen — not gehen or geben" },
  { prefix: "zer-", examples: "zerbrechen, zerschneiden" },
  { prefix: "emp-", examples: "empfehlen, empfangen" },
  { prefix: "miss-", examples: "missverstehen, misslingen" },
];

export const STRESS_NOTE =
  "A separable verb stresses the prefix: AUF-stehen, EIN-nehmen. The prefix jumps to the end of a main clause. Inseparable prefixes are unstressed and never leave the verb: verSTEHen, beKOMmen.";

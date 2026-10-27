export type Chapter = {
  number: number;
  level: "A1" | "A2" | "B1";
  section: string;
  title: string;
  topic: string;
  situation: string;
  lessonId?: string;
};

export const LEVEL_PATH: Record<"A1" | "A2" | "B1", number[]> = {
  A1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 30, 31, 32, 33, 45, 47, 48],
  A2: [21, 22, 25, 26, 27, 28, 29, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 46],
  B1: [39, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80],
};

const LESSON: Partial<Record<number, string>> = {
  1: "a1-01-pronomen",
  2: "a1-02-praesens",
  3: "a1-03-sein-haben",
  4: "a1-04-vokalwechsel",
  5: "a1-modalverben-station",
  6: "a1-modalverben-station",
  7: "a1-07-trennbar",
  8: "a1-08-imperativ",
  9: "a1-09-fragewort",
  10: "a1-10-janein",
  11: "a1-11-wortstellung",
  12: "a1-12-satzklammer",
  13: "a1-13-plural",
  14: "a1-14-artikel",
  15: "a1-15-negation",
  16: "a1a2-faelle-krankenhaus",
  17: "a1a2-faelle-krankenhaus",
  18: "a1-18-possessiv",
  19: "a1-19-welcher",
  20: "a1-20-pronomen",
  21: "a2-21-dativ-akkusativ",
  22: "a2-22-dativverben",
  25: "a2-25-perfekt-sein",
  26: "a2-26-partizipien",
  27: "a2-27-modal-praeteritum",
  28: "a2-28-tempuswahl",
  29: "a2-29-reflexiv",
  23: "a1-23-praeteritum",
  24: "a1-24-perfekt",
  30: "a1-30-temporal",
  31: "a1-31-dativpraepositionen",
  32: "a1-32-akkusativpraep",
  33: "a1-33-wechsel-dativ",
  34: "a2-34-wechselpraepositionen",
  35: "a2-35-lokal",
  36: "a2-36-adjektive",
  37: "a2-37-adjektive-dativ",
  38: "a2-38-komparativ",
  39: "b1-39-superlativ",
  40: "a2-40-aduso",
  41: "a2-41-konnektoren-pos1",
  42: "a2-42-weil-dass-wenn",
  43: "a2-43-da-dahin-daher",
  44: "a2-44-partikeln",
  45: "a1-45-komposita",
  46: "a2-46-wortbildung",
  47: "a1-47-zusammengesetzte-verben",
  48: "a1-48-genusregeln",
  49: "b1-49-praeteritum",
  50: "b1-50-plusquamperfekt",
  51: "b1-51-reflexiv-dativ",
  52: "b1-52-trennbar-untrennbar",
  53: "b1-53-verben-mit-praepositionen",
  54: "b1-54-praepositionaladverbien",
  55: "b1-55-konjunktiv-ii-formen",
  56: "b1-56-konjunktiv-ii-verwendung",
  57: "b1-57-passiv-praesens",
  58: "b1-58-passiv-praeteritum",
  59: "b1-59-futur-annahme",
  60: "b1-60-werden-verwendungen",
  61: "b1-61-lassen",
  62: "b1-62-lage-richtung",
  63: "b1-63-genitiv",
  64: "b1-64-n-deklination",
  65: "b1-65-adjektive-personen",
  66: "b1-66-adjektive-neutrum",
  67: "b1-67-indirekte-fragen",
};

type Seed = [number, "A1" | "A2" | "B1", string, string, string, string];

const SEEDS: Seed[] = [
  [1, "A1", "Verben 1", "Ich, du, er, sie, es, wir, ihr, sie und Sie", "Personal pronouns", "On admission the nurse sorts ich, du and Sie, and matches der/die/das things to er, sie and es."],
  [2, "A1", "Verben 1", "Ich komme, du kommst", "Present tense", "A morning shift: who works, waits, documents and asks, with the regular present endings."],
  [3, "A1", "Verben 1", "Ich bin, du hast, er möchte", "sein, haben, möchten", "At the nurses' station people say who they are, what they have, and what they would like."],
  [4, "A1", "Verben 1", "Ich esse wenig, aber du isst viel!", "Vowel-change verbs", "A patient sleeps, eats nothing, and the nurse gives and sees — verbs that change their vowel."],
  [5, "A1", "Verben 1", "Ich muss, ich kann, ich will", "Modal verbs: form and position", "The evening before surgery: müssen, können, dürfen and the infinitive at the end."],
  [6, "A1", "Verben 1", "Kann ich oder muss ich?", "Modal verbs: meaning", "The same ward round, now choosing the modal that matches a rule, a wish or a permission."],
  [7, "A1", "Verben 1", "Ich kaufe im Supermarkt ein", "Separable verbs", "The patient gets up, takes a tablet and calls the ward — the prefix goes to the end."],
  [8, "A1", "Verben 1", "Helfen Sie mir!", "Imperative", "Polite instructions at the bedside: breathe in, drink, and call the nurse."],
  [9, "A1", "Sätze und Fragen", "Wer? Wie? Wo? Was?", "W-questions", "An admission interview: Wer sind Sie? Wo haben Sie Schmerzen? Seit wann?"],
  [10, "A1", "Sätze und Fragen", "Lernen Sie Deutsch?", "Yes/no questions", "The doctor turns statements into short questions before the examination."],
  [11, "A1", "Sätze und Fragen", "Wo steht was?", "Word order 1", "Time, manner and place in a short handover sentence."],
  [12, "A1", "Sätze und Fragen", "Ich kaufe … ein", "Word order 2", "Separable verbs again, now inside a fuller ward sentence."],
  [13, "A1", "Pronomen, Nomen und Artikel", "Die Männer, die Frauen, die Babys", "Noun plurals", "Counting beds, tablets, patients and syringes on the trolley."],
  [14, "A1", "Pronomen, Nomen und Artikel", "Der, das, die – ein, ein, eine", "Articles", "Labelling the trolley: der Verband, die Spritze, das Pflaster, ein Bett."],
  [15, "A1", "Pronomen, Nomen und Artikel", "Kein, nicht, nie", "Negation", "Nil by mouth and other bans: kein Wasser, nicht essen, nie allein aufstehen."],
  [16, "A1", "Pronomen, Nomen und Artikel", "Ich liebe meinen Mann", "Accusative", "The doctor examines the patient and gives a tablet — who and what."],
  [17, "A1", "Pronomen, Nomen und Artikel", "Ich fahre mit dem Auto", "Dative", "The nurse gives the patient the tablet and helps the patient."],
  [18, "A1", "Pronomen, Nomen und Artikel", "Mein, dein, unser", "Possessive articles", "Your chart, my ward, our team — possessives on the file."],
  [19, "A1", "Pronomen, Nomen und Artikel", "Welcher? – Dieser", "Welcher and dieser", "Which room, this patient, that monitor — pointing on the ward."],
  [20, "A1", "Pronomen, Nomen und Artikel", "Nur mit dir – nie ohne dich", "Pronouns in accusative and dative", "I help you, the doctor examines him, we thank them."],
  [21, "A2", "Pronomen, Nomen und Artikel", "Ich kaufe meinem Sohn einen Ball", "Verbs with accusative and dative", "Giving, showing and explaining: one person in the dative, one thing in the accusative."],
  [22, "A2", "Pronomen, Nomen und Artikel", "Ich helfe dir, du dankst mir", "Dative verbs", "helfen, danken, gehören on the ward — the person stays in the dative."],
  [23, "A1", "Verben 2", "Ich war, ich hatte", "Past of sein and haben", "Yesterday's shift: the patient was in pain and had a fever."],
  [24, "A1", "Verben 2", "Was hast du gestern gemacht?", "Perfect with haben", "What the night shift did: measured, documented, called."],
  [25, "A2", "Verben 2", "Ich bin gekommen, ich habe gelacht", "Perfect with sein", "The patient has arrived, got up and gone to radiology."],
  [26, "A2", "Verben 2", "Gesehen – eingekauft – bezahlt", "Past participles", "Building the participle for regular, separable and strong ward verbs."],
  [27, "A2", "Verben 2", "Ich konnte, ich musste, ich wollte", "Past of modal verbs", "Last night he could not sleep and had to call the nurse."],
  [28, "A2", "Verben 2", "Gestern hatte ich Durst und habe Saft getrunken", "Choosing the tense", "A progress note that mixes yesterday's state and what happened."],
  [29, "A2", "Verben 2", "Sie wäscht sich", "Reflexive verbs", "Wash, rest, get dressed — daily care with sich."],
  [30, "A1", "Präpositionen 1", "Im, am, um, von … bis, nach und vor", "Time prepositions", "Medication times: um acht, am Morgen, von 8 bis 12, nach dem Essen."],
  [31, "A1", "Präpositionen 1", "Aus, bei, mit, nach, seit, von oder zu", "Dative prepositions", "With the GP, since Monday, to the ward, from the ambulance."],
  [32, "A1", "Präpositionen 1", "Für, um, durch, ohne und gegen", "Accusative prepositions", "For the patient, without water, against the pain."],
  [33, "A1", "Präpositionen 1", "Wo? Im Kino", "Two-way prepositions, dative", "Where is it? The chart is in the room, the patient is in bed."],
  [34, "A2", "Präpositionen 1", "Im Kino oder ins Kino?", "Two-way prepositions, both cases", "Where is the patient, and where are they going — Zimmer or in den OP?"],
  [35, "A2", "Präpositionen 1", "Beim Bäcker, zum Friseur, auf den Sportplatz", "Place prepositions", "To radiology, at the GP, on the ward."],
  [36, "A2", "Adjektive 1", "Ein netter Mann! Ich liebe den netten Mann", "Adjective endings, nominative and accusative", "A calm patient, the calm patient — endings before and after the article."],
  [37, "A2", "Adjektive 1", "Am ersten Mai", "Adjective endings with the dative", "With the new dressing, after the first day, in the small room."],
  [38, "A2", "Adjektive 1", "Schneller als …", "Comparative", "The pain is stronger than yesterday. Please come sooner."],
  [39, "B1", "Adjektive 1", "Der kleinste Mann läuft am schnellsten", "Superlative", "The highest fever on the ward, the most urgent call."],
  [40, "A2", "Sätze und Satzverbindungen 1", "Und, aber, oder, denn", "Connectors in position 0", "A handover that links two main clauses with und, aber, oder, denn and sondern."],
  [41, "A2", "Sätze und Satzverbindungen 1", "Deshalb, sonst, dann, danach", "Connectors in position 1", "Therefore he stays in bed; otherwise the wound opens; then we call."],
  [42, "A2", "Sätze und Satzverbindungen 1", "Weil, dass und wenn", "Subordinate clauses", "Because the patient has a fever, the verb goes to the end."],
  [43, "A2", "Sätze und Satzverbindungen 1", "Ich bin da. Kommst du auch dahin?", "Place adverbs", "Here, there, to the station, from the room — da, dahin, daher."],
  [44, "A2", "Sätze und Satzverbindungen 1", "Was heißt das denn?", "Particles", "Softening a difficult question: denn, mal, doch at the bedside."],
  [45, "A1", "Wortbildung", "Kinderarzt oder Arztkinder?", "Compounds", "Krankenhaus, Blutdruck, Schmerztablette — reading a compound from the end."],
  [46, "A2", "Wortbildung", "-chen, -lein, -er, -in, -ung", "Word formation", "Pflegerin, Untersuchung, Tabletten — building words the ward already uses."],
  [47, "A1", "Wortbildung", "Ich bin dann mal weg", "Compound verbs", "anrufen, aufstehen, mitkommen as one idea with a moving prefix."],
  [48, "A1", "Wortbildung", "Der, die oder das?", "Gender patterns", "Why die Station, das Zimmer and der Verband often follow a pattern."],
  [49, "B1", "Verben 3", "Er kam, sah und sagte", "Simple past", "A short case history in the narrative past: kam, sah, sagte."],
  [50, "B1", "Verben 3", "Ich hatte zu lange geschlafen", "Past perfect", "Before the operation he had already eaten — the tense before the past."],
  [51, "B1", "Verben 3", "Ich wasche mir die Hände", "Reflexive pronouns in the dative", "I wash my hands, she hurts herself — mir and mich in care."],
  [52, "B1", "Verben 3", "Kaufe ich ein oder bestelle ich Pizza?", "Separable and inseparable verbs", "untersuchen stays together; aufstehen splits. A team meeting sorts them."],
  [53, "B1", "Verben 3", "Sie freut sich über die Blumen", "Verbs with prepositions", "warten auf, sprechen mit, sich freuen über in a family conversation."],
  [54, "B1", "Verben 3", "Daneben, danach, dafür …", "Prepositional adverbs", "The patient asks about it: Worauf warten Sie? Darauf."],
  [55, "B1", "Verben 3", "War, hätte, würde …", "Konjunktiv II forms", "Polite requests and hypothetical shifts: Könnten Sie, ich hätte Zeit."],
  [56, "B1", "Verben 3", "Wenn ich viel Geld hätte, …", "Konjunktiv II use", "If the pain were worse, we would call the doctor."],
  [57, "B1", "Verben 3", "Das Auto wird gebaut", "Passive, part 1", "The wound is cleaned, the tablet is given — present passive on the chart."],
  [58, "B1", "Verben 3", "Wann wurde der Kölner Dom gebaut?", "Passive, part 2", "The operation was performed yesterday. By whom?"],
  [59, "B1", "Verben 3", "Der Präsident wird kommen", "Future and assumption", "The consultant will come at ten — or is that only a guess?"],
  [60, "B1", "Verben 3", "Werden, werden, werden …", "Uses of werden", "Future, passive and assumption, sorted on three ward examples."],
  [61, "B1", "Verben 3", "Leben und leben lassen", "lassen", "Let the patient sleep; have the bloods taken."],
  [62, "B1", "Verben 3", "Sitzen/setzen, stehen/stellen, liegen/legen und hängen", "Position and direction verbs", "The chart lies on the desk; the nurse lays it on the bed."],
  [63, "B1", "Nomen 2", "Das Auto seines Vaters", "Genitive", "The patient's bed, the doctor's letter, because of the fever."],
  [64, "B1", "Nomen 2", "Kennen Sie den Herrn?", "N-declension", "der Patient, den Patienten, dem Patienten — names that add -en."],
  [65, "B1", "Nomen 2", "Der Jugendliche – ein Jugendlicher", "Adjectives as people", "der Angehörige, ein Verletzter — people named by an adjective."],
  [66, "B1", "Nomen 2", "Alles Gute!", "Neuter adjective nouns", "Alles Gute, etwas Kaltes zu trinken, nichts Neues in the note."],
  [67, "B1", "Sätze und Satzverbindungen 2", "Wissen Sie, ob …?", "Indirect questions", "Ask the patient whether the pain is new, without a question mark."],
  [68, "B1", "Sätze und Satzverbindungen 2", "Es ist schön, zu feiern", "Infinitive with zu", "It is important to document the wound. The patient tries to stand up."],
  [69, "B1", "Sätze und Satzverbindungen 2", "Ich will singen, lass mich singen!", "Infinitive without zu", "Modal verbs, bleiben and lassen — no zu before the infinitive."],
  [70, "B1", "Sätze und Satzverbindungen 2", "Das ist der Mann, der immer meine Nachbarin besucht", "Relative clauses 1", "The patient who is in room 12, the tablet that she takes."],
  [71, "B1", "Sätze und Satzverbindungen 2", "Wie heißt das Ding, mit dem man …?", "Relative clauses 2", "The monitor with which we measure, the colleague to whom we report."],
  [72, "B1", "Sätze und Satzverbindungen 2", "Ich gehe, wenn … / Ich ging, als …", "wenn and als", "When the fever rises (repeated) and when the ambulance arrived (once)."],
  [73, "B1", "Sätze und Satzverbindungen 2", "Während, bevor, nachdem und seit", "Time clauses", "Before the operation, after the dressing change, while the patient sleeps."],
  [74, "B1", "Sätze und Satzverbindungen 2", "Um … zu und damit", "Purpose clauses", "We raise the bed so that the patient can breathe more easily."],
  [75, "B1", "Sätze und Satzverbindungen 2", "Entweder … oder, weder … noch", "Paired connectors", "Either tea or water; neither food nor tablets before the scan."],
  [76, "B1", "Sätze und Satzverbindungen 2", "Je größer, desto besser!", "The … the …", "The earlier we call, the safer the night is."],
  [77, "B1", "Präpositionen 2", "Während, wegen, trotz, innerhalb, außerhalb", "Genitive prepositions", "Because of the pain, despite the fever, during the round."],
  [78, "B1", "Präpositionen 2", "Innerhalb, außerhalb, in, nach, vor, seit, bei und während", "More time prepositions", "Within an hour, since the operation, during the night shift."],
  [79, "B1", "Adjektive 2", "Deutsches Bier", "Adjective endings with and without an article", "Fresh water, the fresh water, a fresh dressing — three patterns."],
  [80, "B1", "Adjektive 2", "Singende Vögel und fliegende Fische", "Present participle as adjective", "A sleeping patient, rising fever, the attending doctor."],
];

export const CHAPTERS: Chapter[] = SEEDS.map(([number, level, section, title, topic, situation]) => ({
  number,
  level,
  section,
  title,
  topic,
  situation,
  lessonId: LESSON[number],
}));

export type CourseCard = {
  level: "A1" | "A2" | "B1";
  chapters: Chapter[];
  lessonId?: string;
};

export function cardsForLevel(level: "A1" | "A2" | "B1"): CourseCard[] {
  const byNumber = new Map(CHAPTERS.map((chapter) => [chapter.number, chapter]));
  const cards: CourseCard[] = [];
  const numbers = LEVEL_PATH[level];
  for (let i = 0; i < numbers.length; i++) {
    const chapter = byNumber.get(numbers[i]);
    if (!chapter) continue;
    const next = byNumber.get(numbers[i + 1]);
    if (chapter.lessonId && next?.lessonId === chapter.lessonId) {
      cards.push({ level, chapters: [chapter, next], lessonId: chapter.lessonId });
      i++;
    } else {
      cards.push({ level, chapters: [chapter], lessonId: chapter.lessonId });
    }
  }
  return cards;
}

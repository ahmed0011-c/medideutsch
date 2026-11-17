export type ClinicalAbbreviation = {
  /** Form shown on the card, including dots. */
  canonical: string;
  /** German expansion. */
  expansion: string;
  /** Short English meaning. */
  en: string;
  /**
   * Bare lowercase would be an ordinary German word (`ob`).
   * Match only dotted or capitalised input.
   */
  careful?: boolean;
};

/** Common chart abbreviations. Checked before any online lookup. */
export const CLINICAL_ABBREVIATIONS: ClinicalAbbreviation[] = [
  { canonical: "RR", expansion: "Riva-Rocci", en: "blood pressure" },
  { canonical: "EKG", expansion: "Elektrokardiogramm", en: "electrocardiogram (ECG)" },
  { canonical: "i.v.", expansion: "intravenös", en: "intravenous" },
  { canonical: "i.m.", expansion: "intramuskulär", en: "intramuscular" },
  { canonical: "s.c.", expansion: "subkutan", en: "subcutaneous" },
  { canonical: "s.l.", expansion: "sublingual", en: "sublingual" },
  { canonical: "p.o.", expansion: "per os", en: "by mouth" },
  { canonical: "p.r.", expansion: "per rectum", en: "rectally" },
  { canonical: "OP", expansion: "Operation", en: "operation" },
  { canonical: "Z.n.", expansion: "Zustand nach", en: "condition after (status post)" },
  { canonical: "V.a.", expansion: "Verdacht auf", en: "suspicion of" },
  { canonical: "DD", expansion: "Differentialdiagnose", en: "differential diagnosis" },
  { canonical: "BZ", expansion: "Blutzucker", en: "blood glucose" },
  { canonical: "Hb", expansion: "Hämoglobin", en: "hemoglobin" },
  { canonical: "CRP", expansion: "C-reaktives Protein", en: "C-reactive protein" },
  { canonical: "KH", expansion: "Krankenhaus", en: "hospital (also carbohydrates)" },
  { canonical: "ZVK", expansion: "zentraler Venenkatheter", en: "central venous catheter" },
  { canonical: "PVK", expansion: "peripherer Venenkatheter", en: "peripheral IV cannula" },
  { canonical: "b.B.", expansion: "bei Bedarf", en: "as needed (PRN)" },
  { canonical: "o.B.", expansion: "ohne Befund", en: "no abnormal findings", careful: true },
  { canonical: "NPO", expansion: "nil per os", en: "nothing by mouth" },
  { canonical: "nüchtern", expansion: "nüchtern", en: "fasting / nothing by mouth" },
  { canonical: "CT", expansion: "Computertomographie", en: "CT scan" },
  { canonical: "MRT", expansion: "Magnetresonanztomographie", en: "MRI" },
  { canonical: "Rö", expansion: "Röntgen", en: "X-ray" },
  { canonical: "Sono", expansion: "Sonographie", en: "ultrasound" },
  { canonical: "ITS", expansion: "Intensivstation", en: "intensive care unit" },
  { canonical: "ZNA", expansion: "zentrale Notaufnahme", en: "emergency department" },
  { canonical: "HF", expansion: "Herzfrequenz", en: "heart rate" },
  { canonical: "AF", expansion: "Atemfrequenz", en: "respiratory rate" },
  { canonical: "SpO2", expansion: "Sauerstoffsättigung", en: "oxygen saturation" },
  { canonical: "BGA", expansion: "Blutgasanalyse", en: "blood gas" },
  { canonical: "BB", expansion: "Blutbild", en: "blood count" },
  { canonical: "INR", expansion: "International Normalized Ratio", en: "INR (clotting)" },
  { canonical: "Na", expansion: "Natrium", en: "sodium" },
  { canonical: "K", expansion: "Kalium", en: "potassium" },
  { canonical: "Krea", expansion: "Kreatinin", en: "creatinine" },
  { canonical: "GFR", expansion: "glomeruläre Filtrationsrate", en: "glomerular filtration rate" },
  { canonical: "PEG", expansion: "perkutane endoskopische Gastrostomie", en: "PEG feeding tube" },
  { canonical: "DK", expansion: "Dauerkatheter", en: "indwelling urinary catheter" },
  { canonical: "HWS", expansion: "Halswirbelsäule", en: "cervical spine" },
  { canonical: "BWS", expansion: "Brustwirbelsäule", en: "thoracic spine" },
  { canonical: "LWS", expansion: "Lendenwirbelsäule", en: "lumbar spine" },
  { canonical: "aHT", expansion: "arterielle Hypertonie", en: "arterial hypertension" },
  { canonical: "DM", expansion: "Diabetes mellitus", en: "diabetes mellitus" },
  { canonical: "KHK", expansion: "koronare Herzkrankheit", en: "coronary heart disease" },
  { canonical: "COPD", expansion: "chronisch obstruktive Lungenerkrankung", en: "COPD" },
  { canonical: "TIA", expansion: "transitorische ischämische Attacke", en: "transient ischemic attack" },
  { canonical: "ACS", expansion: "akutes Koronarsyndrom", en: "acute coronary syndrome" },
  { canonical: "STEMI", expansion: "ST-Hebungsinfarkt", en: "ST-elevation myocardial infarction" },
  { canonical: "NSTEMI", expansion: "Nicht-ST-Hebungsinfarkt", en: "non-ST-elevation myocardial infarction" },
  { canonical: "GCS", expansion: "Glasgow Coma Scale", en: "Glasgow coma scale" },
  { canonical: "VAS", expansion: "visuelle Analogskala", en: "visual analogue pain scale" },
  { canonical: "NRS", expansion: "numerische Rating-Skala", en: "numeric pain scale" },
  { canonical: "HWI", expansion: "Harnwegsinfekt", en: "urinary tract infection" },
  { canonical: "HWZ", expansion: "Halbwertszeit", en: "half-life" },
  { canonical: "UAW", expansion: "unerwünschte Arzneimittelwirkung", en: "adverse drug reaction" },
  { canonical: "NW", expansion: "Nebenwirkung", en: "side effect" },
  { canonical: "tgl.", expansion: "täglich", en: "daily" },
  { canonical: "bds.", expansion: "beidseits", en: "both sides" },
];

const ALIAS: Record<string, string> = {
  nuechtern: "nüchtern",
  nuchtern: "nüchtern",
  spo2: "spo2",
  "s.p.o2": "spo2",
};

function fold(input: string): string {
  return input.trim().toLocaleLowerCase("de").replace(/[.·\s]/g, "");
}

const BY_KEY = new Map<string, ClinicalAbbreviation>();
for (const entry of CLINICAL_ABBREVIATIONS) {
  BY_KEY.set(fold(entry.canonical), entry);
}

export function lookupAbbreviation(input: string): ClinicalAbbreviation | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes(" ") && fold(trimmed) !== "nilperos") return null;
  const key = ALIAS[fold(trimmed)] ?? fold(trimmed);
  const entry = BY_KEY.get(key);
  if (!entry) return null;
  if (entry.careful) {
    const bare = trimmed === trimmed.toLocaleLowerCase("de") && !trimmed.includes(".");
    if (bare) return null;
  }
  return entry;
}

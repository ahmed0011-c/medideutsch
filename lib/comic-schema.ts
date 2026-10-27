import { z } from "zod";

export const glossEntrySchema = z.object({
  pos: z.string(),
  de: z.string(),
  en: z.string(),
  emoji: z.string(),
  note: z.string().optional(),
  art: z.string().optional(),
  pl: z.string().optional(),
  gov: z.string().optional(),
  plOnly: z.boolean().optional(),
  case: z.string().optional(),
});

export const comicCharacterSchema = z.object({
  name: z.string(),
  role: z.string(),
  color: z.string(),
  pitch: z.number(),
  rate: z.number(),
});

export const comicChapterSchema = z.object({
  n: z.number().int().positive(),
  id: z.string().min(1),
  emoji: z.string(),
  title: z.string(),
  time: z.string(),
  en: z.string(),
  summary: z.string(),
  goals: z.array(z.string()).min(1),
  examTip: z.string().optional(),
});

export const comicPanelSchema = z.object({
  id: z.string().min(1),
  ch: z.number().int().positive(),
  scene: z.string().min(1),
  chars: z.array(
    z.object({
      c: z.string(),
      x: z.number(),
      mood: z.string(),
      prop: z.string().optional(),
    }),
  ),
  bubbles: z.array(
    z.object({
      who: z.string(),
      de: z.string(),
      en: z.string(),
    }),
  ),
  caption: z.string().optional(),
  clock: z.string().optional(),
  tip: z.string().optional(),
  scaleMark: z.number().int().min(0).max(10).optional(),
  scaleLabel: z.string().max(22).optional(),
  vitals: z
    .object({
      time: z.string(),
      hf: z.string(),
      spo2: z.string(),
      rr: z.string(),
      temp: z.string(),
      rr2: z.string().optional(),
    })
    .optional(),
  sbar: z.enum(["S", "B", "A", "R"]).optional(),
});

export const vocabItemSchema = z.object({
  key: z.string(),
  theme: z.string(),
  ch: z.number().int().positive(),
  example: z.string(),
  panel: z.string(),
});

export const redemittelSchema = z.object({
  ch: z.number().int().positive(),
  group: z.string(),
  icon: z.string(),
  items: z.array(
    z.object({
      de: z.string(),
      en: z.string(),
      panel: z.string().nullable(),
    }),
  ),
});

export const quizItemSchema = z.object({
  ch: z.number().int().positive(),
  type: z.enum(["pic", "gap", "reply", "mc"]),
  pic: z.string().optional(),
  q: z.string(),
  en: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explain: z.string(),
  panel: z.string(),
  ctx: z.array(z.object({ who: z.string(), de: z.string() })).optional(),
});

export const cheatsheetSchema = z.object({
  title: z.string(),
  intro: z.string(),
  steps: z
    .array(
      z.object({
        n: z.number().int().positive(),
        title: z.string(),
        phrases: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});

export const comicLessonSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  subtitle: z.string(),
  level: z.string(),
  section: z.string(),
  disclaimer: z.string(),
  closing: z.string().optional(),
  cheatsheet: cheatsheetSchema.optional(),
  characters: z.record(z.string(), comicCharacterSchema),
  caseColors: z.record(z.string(), z.string()),
  chapters: z.array(comicChapterSchema).min(1),
  panels: z.array(comicPanelSchema).min(1),
  glossary: z.record(z.string(), glossEntrySchema),
  vocab: z.array(vocabItemSchema),
  redemittel: z.array(redemittelSchema),
  quiz: z.array(quizItemSchema).min(1),
  library: z
    .object({
      grammatik: z.array(z.object({ title: z.string(), level: z.string(), emoji: z.string(), status: z.string(), desc: z.string() })),
      wortschatz: z.array(z.object({ title: z.string(), level: z.string(), emoji: z.string(), status: z.string(), desc: z.string() })),
    })
    .optional(),
});

export type GlossEntry = z.infer<typeof glossEntrySchema>;
export type ComicLesson = z.infer<typeof comicLessonSchema>;
export type ComicPanel = z.infer<typeof comicPanelSchema>;
export type ComicQuizItem = z.infer<typeof quizItemSchema>;

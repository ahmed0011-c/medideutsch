import { z } from "zod";

export const hoerenPosSchema = z.enum(["verb", "noun", "prep", "compound", "other"]);

export const hoerenTokenSchema = z.object({
  w: z.string().min(1),
  pos: hoerenPosSchema,
  lemma: z.string().optional(),
  article: z.string().optional(),
  split: z.array(z.string()).optional(),
  de: z.string().optional(),
  en: z.string().optional(),
  link: z.string().optional(),
});

export const hoerenLineSchema = z.object({
  id: z.string().min(1),
  t: z.number().min(0),
  speaker: z.string().min(1),
  tokens: z.array(hoerenTokenSchema).min(1),
});

export const hoerenQuestionSchema = z.object({
  id: z.string().min(1),
  t: z.number().min(0),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(3),
  answer: z.number().int().min(0).max(2),
});

export const hoerenLessonSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  level: z.string().min(1),
  series: z.string().min(1),
  episode: z.number().int().positive(),
  videoId: z.string().min(6),
  durationSec: z.number().positive(),
  source: z.object({
    youtube: z.string().url(),
    manuskript: z.string().url(),
    channel: z.string().min(1),
  }),
  timestampsApproximate: z.boolean(),
  summary: z.string().min(1),
  lines: z.array(hoerenLineSchema).min(1),
  questions: z.array(hoerenQuestionSchema).min(1),
});

export type HoerenPos = z.infer<typeof hoerenPosSchema>;
export type HoerenToken = z.infer<typeof hoerenTokenSchema>;
export type HoerenLine = z.infer<typeof hoerenLineSchema>;
export type HoerenQuestion = z.infer<typeof hoerenQuestionSchema>;
export type HoerenLesson = z.infer<typeof hoerenLessonSchema>;

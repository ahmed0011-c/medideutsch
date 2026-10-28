import { z } from "zod";

export const levelSchema = z.enum(["A1", "A2", "B1", "A1/A2"]);

export const imageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("svg"), id: z.string().min(1) }),
  z.object({ type: z.literal("url"), src: z.string().min(1) }),
]);

export const caseMetaSchema = z.object({
  c: z.enum(["N", "A", "D", "G"]),
  gender: z.string(),
  text: z.string(),
});

export const glossaryEntrySchema = z.object({
  de: z.string().min(1),
  pos: z.string().min(1),
  en: z.string().min(1),
  emoji: z.string().optional(),
  article: z.enum(["der", "die", "das"]).optional(),
  plural: z.string().optional(),
  note: z.string().optional(),
  case: caseMetaSchema.optional(),
  /** Inline drawing from the sprite set. The popup and Wortbank show it. */
  image: imageSchema.optional(),
});

export const tipCardSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  mnemonic: z.string().optional(),
  emoji: z.string().optional(),
  color: z.enum(["N", "A", "D", "G"]).optional(),
  rule: z.string().optional(),
  examples: z
    .array(z.object({ de: z.string(), en: z.string() }))
    .optional(),
});

export const scoringSchema = z.object({
  firstTry: z.number().int().positive(),
  afterRetry: z.number().int().nonnegative(),
  wordExplorePoints: z.number().int().nonnegative(),
  hintCost: z.number().int().nonnegative().default(1),
  tipPoints: z.number().int().nonnegative().default(1),
  stars: z.object({
    "3": z.number(),
    "2": z.number(),
    "1": z.number(),
  }),
});

export const practiceRoleSchema = z.enum([
  "match",
  "gap",
  "choose",
  "build",
  "transform",
  "error",
  "picture",
  "dialogue",
  "reading",
  "writing",
  "lernkontrolle",
]);

const stepBase = {
  id: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  scoreLabel: z.string().optional(),
  /** Which practice job this step does. The validator requires every role except on the template. */
  practice: practiceRoleSchema.optional(),
};

export const mcSchema = z.object({
  kind: z.enum(["mc", "tf"]).optional(),
  q: z.string(),
  qEn: z.string().optional(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  why: z.string(),
  hint: z.string().optional(),
});

export const overviewStepSchema = z.object({
  ...stepBase,
  type: z.literal("overview"),
  learn: z.array(z.string()).min(3),
  minutes: z.number().int().positive().optional(),
  vocab: z
    .array(
      z.object({
        de: z.string(),
        article: z.enum(["der", "die", "das"]).optional(),
        plural: z.string().optional(),
        en: z.string(),
        emoji: z.string().optional(),
        image: imageSchema.optional(),
        glossaryKey: z.string().optional(),
      }),
    )
    .min(3),
  text: z.object({
    title: z.string(),
    de: z.string(),
    en: z.string(),
  }),
});

export const dialogueStepSchema = z.object({
  ...stepBase,
  type: z.literal("dialogue"),
  instructions: z.string(),
  scene: z.string(),
  sceneTitle: z.string().optional(),
  speakers: z.record(
    z.string(),
    z.object({ name: z.string(), role: z.string(), avatar: z.string() }),
  ),
  lines: z
    .array(z.object({ who: z.string(), de: z.string(), en: z.string() }))
    .min(1),
  highlight: z
    .object({
      button: z.string(),
      /** Highlight glossary entries whose pos contains this substring (default "modal"). */
      posIncludes: z.string().optional(),
    })
    .optional(),
});

const animTokenSchema = z.object({
  t: z.string(),
  r: z.enum(["subj", "verb", "rest", "modal", "w", "inf"]),
  inf: z.string().optional(),
});

export const grammarStepSchema = z.object({
  ...stepBase,
  type: z.literal("grammar"),
  story: z.array(z.string()).min(1),
  heroTitle: z.string().optional(),
  heroImage: z.string().optional(),
  animation: z
    .array(
      z.object({
        before: z.array(animTokenSchema).min(1),
        modal: z.string().optional(),
        after: z.array(animTokenSchema).optional(),
        enBefore: z.string(),
        enAfter: z.string(),
        callLabel: z.string().optional(),
        bracketLabel: z.string().optional(),
      }),
    )
    .optional(),
  questionRule: z.string().optional(),
  meanings: z
    .array(
      z.object({
        modal: z.string(),
        emoji: z.string(),
        en: z.string(),
        use: z.string(),
        de: z.string(),
        deEn: z.string(),
      }),
    )
    .optional(),
  meaningsTitle: z.string().optional(),
  warning: z
    .object({
      title: z.string(),
      items: z.array(
        z.object({
          de: z.string(),
          en: z.string(),
          tone: z.enum(["ok", "stop"]),
        }),
      ),
      tip: z.string(),
    })
    .optional(),
  conjugation: z
    .object({
      persons: z.array(z.string()),
      main: z.array(z.string()),
      extra: z.array(z.string()).optional(),
      forms: z.record(z.string(), z.array(z.string())),
      tips: z.array(z.string()),
    })
    .optional(),
  tables: z
    .array(
      z.object({
        title: z.string(),
        caption: z.string().optional(),
        columns: z.array(z.string()),
        rows: z.array(
          z.object({
            label: z.string(),
            cells: z.array(z.string()),
            highlight: z.boolean().optional(),
          }),
        ),
      }),
    )
    .optional(),
  tips: z.array(tipCardSchema).optional(),
  quiz: z.array(mcSchema).default([]),
  quizTitle: z.string().optional(),
});

const caseId = z.enum(["N", "A", "D", "G"]);

export const casesStepSchema = z.object({
  ...stepBase,
  type: z.literal("cases"),
  intro: z.string(),
  roles: z.array(
    z.object({
      c: caseId,
      title: z.string(),
      metaphor: z.string(),
      q: z.string(),
      de: z.string(),
      en: z.string(),
    }),
  ),
  table: z.object({
    genders: z.array(z.string()),
    definite: z.record(caseId, z.array(z.string())),
    indefinite: z.record(caseId, z.array(z.string())),
    note: z.string(),
  }),
  animation: z.array(
    z.object({
      parts: z.array(
        z.object({
          t: z.string(),
          c: caseId.optional(),
          q: z.string().optional(),
        }),
      ),
      order: z.array(z.number().int()),
      punct: z.string(),
      en: z.string(),
    }),
  ),
  quiz: z.array(mcSchema),
});

export const tipsStepSchema = z.object({
  ...stepBase,
  type: z.literal("tips"),
  tips: z.array(tipCardSchema).min(1),
});

export const gapfillStepSchema = z.object({
  ...stepBase,
  type: z.literal("gapfill"),
  instructions: z.string(),
  chips: z.array(z.object({ w: z.string(), hint: z.string() })),
  items: z.array(
    z.object({
      who: z.string().optional(),
      before: z.string(),
      after: z.string(),
      answer: z.string(),
      en: z.string(),
      why: z.string(),
      tip: z.string(),
      hint: z.string().optional(),
    }),
  ),
});

export const gapcaseStepSchema = z.object({
  ...stepBase,
  type: z.literal("gapcase"),
  instructions: z.string(),
  chips: z.array(z.string()).min(1),
  chipInfo: z.record(z.string(), z.string()),
  items: z.array(
    z.object({
      before: z.string(),
      base: z.string(),
      after: z.string(),
      answer: z.string(),
      hint: z.string(),
      why: z.string(),
    }),
  ),
});

export const builderStepSchema = z.object({
  ...stepBase,
  type: z.literal("builder"),
  instructions: z.string(),
  items: z.array(
    z.object({
      tiles: z.array(z.string()).min(2),
      answers: z.array(z.string()).min(1),
      punct: z.string(),
      modal: z.string(),
      inf: z.string(),
      question: z.boolean(),
      en: z.string(),
      hint: z.string().optional(),
      feedback: z
        .object({
          end: z.string().optional(),
          first: z.string().optional(),
          fallback: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

export const pictureStepSchema = z.object({
  ...stepBase,
  type: z.literal("picturematch"),
  instructions: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      de: z.string(),
      article: z.enum(["der", "die", "das"]),
      plural: z.string(),
      en: z.string(),
      image: imageSchema,
      hint: z.string().optional(),
    }),
  ),
});

export const colourStepSchema = z.object({
  ...stepBase,
  type: z.literal("colour"),
  instructions: z.string(),
  sentences: z.array(
    z.object({
      parts: z.array(
        z.union([
          z.string(),
          z.object({
            t: z.string(),
            c: caseId,
            why: z.string(),
          }),
        ]),
      ),
      en: z.string(),
    }),
  ),
});

export const readingStepSchema = z.object({
  ...stepBase,
  type: z.literal("reading"),
  instructions: z.string(),
  document: z.object({
    letterhead: z.string(),
    title: z.string(),
    paragraphs: z.array(z.string()).min(1),
    signature: z.string(),
    stamp: z.string().optional(),
  }),
  questions: z.array(mcSchema),
});

export const compareStepSchema = z.object({
  ...stepBase,
  type: z.literal("compare"),
  instructions: z.string(),
  items: z.array(
    z.object({
      prompt: z.string(),
      options: z
        .array(
          z.object({
            emoji: z.string().optional(),
            image: imageSchema.optional(),
            label: z.string(),
            caption: z.string(),
          }),
        )
        .min(2),
      answer: z.number().int().nonnegative(),
      why: z.string(),
      hint: z.string(),
    }),
  ),
});

export const riddleStepSchema = z.object({
  ...stepBase,
  type: z.literal("riddle"),
  instructions: z.string(),
  items: z.array(
    z.object({
      clues: z.array(z.string()).min(1),
      options: z.array(z.string()).min(2),
      answer: z.number().int().nonnegative(),
      reveal: z.string(),
      hint: z.string(),
    }),
  ),
});

export const writingStepSchema = z.object({
  ...stepBase,
  type: z.literal("writing"),
  instructions: z.string(),
  prompt: z.string(),
  bullets: z.array(z.string()).min(2),
  model: z.string(),
  modelEn: z.string().optional(),
  hint: z.string(),
  checklist: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        /** Case-insensitive substrings; any one match counts. */
        keywords: z.array(z.string()).min(1),
      }),
    )
    .min(2),
});

export const quickReactStepSchema = z.object({
  ...stepBase,
  type: z.literal("quickreact"),
  instructions: z.string(),
  /** Shown above the options, for example Wem? */
  cue: z.string().optional(),
  items: z.array(
    z.object({
      prompt: z.string(),
      qEn: z.string().optional(),
      speaker: z.string().optional(),
      speakerLine: z.string().optional(),
      options: z.array(z.string()).min(2),
      answer: z.number().int().nonnegative(),
      why: z.string(),
      hint: z.string().optional(),
    }),
  ).min(1),
});

export const summaryStepSchema = z.object({
  ...stepBase,
  type: z.literal("summary"),
  redemittel: z.array(z.object({ de: z.string(), en: z.string() })),
  rules: z
    .array(z.object({ c: caseId, rule: z.string() }))
    .optional(),
  messages: z.tuple([z.string(), z.string(), z.string(), z.string()]).optional(),
  reviewStepType: z.string().optional(),
});

export const stepSchema = z.discriminatedUnion("type", [
  overviewStepSchema,
  dialogueStepSchema,
  grammarStepSchema,
  casesStepSchema,
  tipsStepSchema,
  gapfillStepSchema,
  gapcaseStepSchema,
  builderStepSchema,
  pictureStepSchema,
  colourStepSchema,
  readingStepSchema,
  compareStepSchema,
  riddleStepSchema,
  quickReactStepSchema,
  writingStepSchema,
  summaryStepSchema,
]);

export const caseInfoSchema = z.object({
  name: z.string(),
  short: z.string(),
  q: z.string(),
  role: z.string(),
  emoji: z.string(),
});

export const lessonSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  platform: z.string(),
  level: levelSchema,
  unit: z.string(),
  title: z.string(),
  subtitle: z.string(),
  interfaceLanguage: z.string(),
  targetLanguage: z.string(),
  chapter: z.number().int().optional(),
  chapters: z.array(z.number().int()).optional(),
  /** Ids from content/scenario-bank.json. Several book situations, rotated across chapters. */
  scenarios: z.array(z.string().min(1)).optional(),
  scoring: scoringSchema,
  cases: z.record(caseId, caseInfoSchema).optional(),
  glossary: z.record(z.string(), glossaryEntrySchema),
  steps: z.array(stepSchema).min(1),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type Step = z.infer<typeof stepSchema>;
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
export type OverviewStep = z.infer<typeof overviewStepSchema>;
export type DialogueStep = z.infer<typeof dialogueStepSchema>;
export type GrammarStep = z.infer<typeof grammarStepSchema>;
export type CasesStep = z.infer<typeof casesStepSchema>;
export type TipsStep = z.infer<typeof tipsStepSchema>;
export type GapFillStep = z.infer<typeof gapfillStepSchema>;
export type GapCaseStep = z.infer<typeof gapcaseStepSchema>;
export type BuilderStep = z.infer<typeof builderStepSchema>;
export type PictureStep = z.infer<typeof pictureStepSchema>;
export type ColourStep = z.infer<typeof colourStepSchema>;
export type ReadingStep = z.infer<typeof readingStepSchema>;
export type CompareStep = z.infer<typeof compareStepSchema>;
export type RiddleStep = z.infer<typeof riddleStepSchema>;
export type QuickReactStep = z.infer<typeof quickReactStepSchema>;
export type WritingStep = z.infer<typeof writingStepSchema>;
export type SummaryStep = z.infer<typeof summaryStepSchema>;
export type McQuestion = z.infer<typeof mcSchema>;

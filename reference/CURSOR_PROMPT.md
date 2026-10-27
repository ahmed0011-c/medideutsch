# Cursor prompt: turn the MediDeutsch demo into a Next.js app

> Open an empty folder in Cursor, copy `index.html` and `lesson.json` from this demo into `/reference`, then paste everything below the line into Cursor Chat (Agent mode).

---

You are building **MediDeutsch**, a web platform for international medical students and doctors who are learning German (A1–B1). The grammar is taught with hospital examples. A working single-file prototype is in `/reference/index.html`. Its content is in `/reference/lesson.json`. **Match the prototype's look, interactions and copy as closely as you can.** Open it in a browser first and try every step.

## Tech stack
- **Next.js 14+ (App Router) + TypeScript**, strict mode
- **Tailwind CSS** using the prototype's design tokens: teal `#0d9488`/`#14b8a6`, blue `#2563eb`, navy `#0f2a3d`, background `#f2f8fa`, 18px card radius, soft shadows. Article colours: der = blue `#2563eb`, die = red `#e11d48`, das = green `#16a34a`.
- **@dnd-kit/core + @dnd-kit/sortable** for all drag-and-drop. Turn on the Pointer, Touch and Keyboard sensors. **Every drag interaction must also work with tap-to-select, then tap-to-place**, the same as in the prototype.
- **Framer Motion** for step transitions, the "+2 ⭐" floating points, shake on wrong answers, pop on correct answers, star reveal on the summary screen, and the **animated sentence bracket**. That last one is a `layout` animation: the main verb slides to the end, the modal drops into position 2, and the Satzklammer bracket draws underneath.
- **Supabase**: auth (email magic link + Google) and Postgres for progress
- **Zod** to validate lesson JSON when building and when loading
- Audio: browser `speechSynthesis` with `lang = "de-DE"` (pick a de-DE voice if one is available). Put it behind an `AudioProvider` interface so it can be swapped later for pre-generated MP3s (e.g. OpenAI TTS) stored in Supabase Storage.

## Content model: new lessons are just JSON files
- Save lessons as `content/lessons/<level>/<lesson-id>.json`, using the **exact schema of `/reference/lesson.json`** (`schemaVersion`, `id`, `level`, `unit`, `title`, `subtitle`, `scoring`, `glossary`, `steps[]`).
- Write `lib/lesson-schema.ts` with Zod schemas for each step type: `dialogue`, `grammar`, `gapfill`, `builder`, `picturematch`, `reading`, `summary`. Export the TypeScript types with `z.infer`.
- Write `lib/lessons.ts` with `getAllLessons()`, `getLesson(level, id)`, plus static generation (`generateStaticParams`). Adding a JSON file must be the only step needed to publish a lesson.
- Build `scripts/validate-lessons.ts` (run in CI and as `npm run validate`). It must:
  1. validate every lesson with Zod;
  2. check that **every token** in dialogue lines and reading documents resolves to a glossary entry, using the prototype's rule: exact match, then lowercase, with the override syntax `[[Surface|glossaryKey]]`;
  3. check that each gap-fill answer appears in `chips`, that builder `answers` use exactly the given `tiles`, and that MC `answer` indexes are within range.
- Images: `picturematch.items[].image` is `{ "type": "svg", "id": "syringe" }`. Move the inline SVGs from the prototype into `components/illustrations/*.tsx`, registered by id. Also allow `{ "type": "url", "src": "/images/..." }` for later.

## Routes
- `/` landing page (hero, how it works, level cards A1/A2/B1)
- `/learn` course map: levels → units → lessons, with stars and progress per lesson
- `/learn/[level]/[lessonId]?step=3` lesson player. The step is kept in the URL (the prototype uses `#step=N`).
- `/login`, `/account`

## Lesson player (rebuild each step as its own component in `components/steps/`)
1. **DialogueStep**: chat bubbles for doctor and patient. Every word is a `<ClickableWord>`; tapping it opens a `<WordPopover>` with the illustration or emoji, article in its colour, lemma, part of speech, English, plural, a note, "🔊 Word" and "🔊 Sentence". On mobile the popover becomes a bottom sheet. Add toggles for "Show English" and "Highlight modal verbs", "Play dialogue" (reads each line in turn and highlights it), and a words-explored meter (1 point per new word, up to `scoring.wordExplorePoints`).
2. **GrammarStep**: Oberarzt hero card, the animated bracket demo with "Call the Oberarzt" and "Next example", six meaning cards, the "müssen nicht ≠ nicht dürfen" warning, a colour-coded conjugation table with tabs (singular stem / plural stem / ending, ich = er rows highlighted, tap a cell to hear it), and a 2-question quick check.
3. **GapFillStep**: chip bank (sticky on desktop) and sentences with droppable gaps. Give instant feedback: the correct answer locks in green and shows `why`; a wrong answer shakes and shows the chip's `hint` plus the item's `tip`. A chip that has been used correctly disappears.
4. **BuilderStep**: sortable tiles between bank and answer line (dnd-kit sortable) with an insert indicator and a Check button. Accept any string in `answers` (case-insensitive). Wrong-answer diagnostics: infinitive not last → "back of the queue"; yes/no question without the modal first → "the modal comes first"; otherwise → "the modal stands in position 2".
5. **PictureMatchStep**: drag labels with articles onto illustration cards. A correct match shows the English and plural and plays the audio.
6. **ReadingStep**: a paper-style discharge note with clickable words, plus MC / true-false questions with explanations.
7. **SummaryStep**: score, 0–3 stars (thresholds come from `scoring.stars`), a bar for each section, confetti at 2 stars or more, the Redemittel list with audio, plus "Try again" and "Review grammar".

Shared pieces: a sticky header (logo, lesson title, points pill with mini stars), a progress bar with clickable step dots, and a fixed footer with Back / status / Next. Scoring is `firstTry = 2` and `afterRetry = 1` per item, and each item is awarded once. Keep it all in one `useLessonProgress` hook (Zustand or a reducer).

## Supabase
Write SQL migrations in `supabase/migrations`:
- `profiles (id uuid pk references auth.users, display_name text, native_language text, target_level text, created_at timestamptz)`
- `lesson_progress (user_id uuid references auth.users, lesson_id text, step_index int, points int, max_points int, stars int, item_state jsonb, completed_at timestamptz, updated_at timestamptz, primary key (user_id, lesson_id))`
- `word_seen (user_id uuid, glossary_key text, lesson_id text, seen_at timestamptz, primary key (user_id, glossary_key))`, which will feed a future flashcard / spaced-repetition feature
- Turn on **RLS** so users can only read and write their own rows.
- Guests can play every lesson. Their progress goes to localStorage and is merged into Supabase after they log in. Save to Supabase with a debounce (about 1 s) after each awarded item and on every step change.
- Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local.example`. Never commit secrets.

## Quality bar
- Mobile first (works at 360px wide), keyboard accessible (dnd-kit keyboard sensor, focus rings, `aria-live` feedback), and respects `prefers-reduced-motion`.
- German text comes **only** from the JSON files. Never generate or change German sentences in code.
- Tests: Vitest for the scoring and answer-checking logic and the token→glossary resolver. Playwright for one end-to-end run through the reference lesson (drag and tap paths both) that ends on 50/50 points.
- Hosting: Vercel. Add a GitHub Action that runs `lint`, `typecheck`, `validate` and `test`.

## Deliverables, in order
1. Scaffold the project, Tailwind theme, and the Zod schema + loader + validator. Copy `/reference/lesson.json` to `content/lessons/a1/a1-modalverben-station.json`.
2. Build the lesson player and all 7 step components so the lesson works with no login.
3. Add Supabase auth + progress, then the `/learn` course map.
4. Write a `docs/LESSON_TEMPLATE.md` that documents each step type with a small JSON example. Then add a blank `content/lessons/_template.json` that a content writer (or ChatGPT) can fill in.

Work step by step. After each deliverable, run the app and compare it with `/reference/index.html`.

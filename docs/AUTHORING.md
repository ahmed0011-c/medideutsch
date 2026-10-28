# Authoring the remaining chapters

The course map in `content/curriculum.ts` lists all 80 chapters of the grammar sequence used for this personal study path. Level order, not book order:

- A1: 1–20, 23, 24, 30–33, 45, 47, 48
- A2: 21, 22, 25–29, 34–38, 40–44, 46
- B1: 39, 49–80

Played in this repo: 1, 2, 3, 4, 5–6 (one lesson), 7, 8, 9, 10, 11, 12, 13, 14, 15, 16–17 (one lesson), 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80. The whole A1 path is playable, and so is every A2 card. B1 chapters 39, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79 and 80 are playable. The card already has the grammar topic and a one-line ward situation. Use that situation; do not paste textbook exercises.

## Checklist for the next chapter

1. Copy `content/lessons/_template.json` to `content/lessons/<level>/<id>.json` and remove the underscore.
2. Set `chapter`, `unit` (`Kapitel N`), `title`, and `subtitle` from the curriculum row.
3. Write an `overview`: 3–4 learning bullets, at least three vocab cards, and a 5–8 sentence hospital reading.
4. Add the chapter’s table (endings, articles, or word order) as a `grammar` step, plus a warning for the exception and one memory tip.
5. Add real practice, not a short quiz. Every played lesson (the template with `chapter: 0` is exempt) needs at least **12 exercises** and **60 items**, in this order of difficulty: recognition, controlled practice, then production. Tag each job with `practice`:
   - `match` — matching
   - `gap` — gap-fill
   - `choose` — choose the form
   - `build` — sentence building
   - `transform` — rewriting
   - `error` — Finde den Fehler
   - `picture` — a picture task
   - `dialogue` — a short dialogue completion (`gapfill` items with `who`)
   - `reading` — a reading with questions
   - `writing` — free writing or speaking, with a model answer
   - `lernkontrolle` — a final mixed grammar quiz of at least 10 items
   `npm run validate` fails if any role, the exercise count, or the item count is missing. A lesson is mastered only when the Lernkontrolle solved-count reaches **80%**. Points and hints do not decide that.
6. Give exercise items a `hint`. A used hint costs 1 point.
7. Glossary: every word in the overview, the dialogue, and the reading. Run `npm run validate`. It fails on a missing word, a gap answer that is not in the chips, a builder answer that does not use exactly the tiles, a quiz index that is out of range, or a lesson under the practice minimum.
8. Point `LESSON[n]` in `content/curriculum.ts` at the new id.
9. Read the German aloud. Keep it medically plausible: drug rounds, dressings, handover, admission, vital signs. Original sentences only.
10. Variety: do not repeat an example sentence, or the same verb with the same person or thing, across exercises in one lesson. Rotate wards, people, and objects. Do not copy a sentence another chapter already uses as its line.
11. Pictures: draw new vocabulary as an inline SVG in `components/illustrations/sprites.ts`. Put that id on the overview card, the picture step, and the glossary `image` field so the word popup and Wortbank show the drawing. `npm run validate` rejects a missing id. A picture step’s instruction names exactly the drawings on the step.

## Where to look

- Modal verbs, word order, pictures: `a1-modalverben-station.json`
- Cases, tips, article gaps, colouring: `a1a2-faelle-krankenhaus.json`
- Compare, riddle, writing, position-0 connectors: `a1-08-imperativ.json`, `a1-01-pronomen.json`, `a2-40-aduso.json`
- Step reference: `docs/LESSON_TEMPLATE.md`

Partner speaking drills and pronunciation drills are not in this version. Stripe is documented in `docs/SUPABASE.md` and is not implemented.

## A Wortschatz comic

Grammar lessons and comic lessons are separate files. A comic is one JSON file in `content/comics/`. The player reads chapters, panels, glossary, Wortschatz, Redemittel, quiz and flashcards from that file. Copy `content/comics/wortschatz-uebergabe-brustschmerzen.json` and change the id.

Each panel needs:

- `scene`: one of `station`, `room`, `monitor`, `ekg`, `meds`, `phone`, `scale`, `lab`, `cath`, `desk`, `corridor`, `aufnahme`, `leg`, `sono`. A new scene means a new function in `components/comic/art.ts` and a name in `COMIC_SCENES`.
- `chars`: character id (`lena`, `tom`, `becker`, `anna`, `oa`, `samir`, `petra`, `ines`, or a new id in `characters`), `x` position, `mood`, and an optional `prop` (`coffee`, `clipboard`, `phone`, `chest`, `stetho`, `cables`, `tourniquet`, `jacket`, `probe`). New props are drawn in `art.ts`.
- `bubbles`: `who`, German `de`, English `en`. Every German word in a bubble, a caption, a vocab example and a Redemittel line needs a glossary entry. A chapter summary may leave a function word untapped; an explicit `[[Surface|key]]` still has to exist. Use that markup when the printed form is not the dictionary key (`Dr.` stays `Dr.`).
- Optional `caption`, `tip` (short HTML with `b` and `i` only), `clock`, `vitals`, or `sbar` (`S` `B` `A` `R` on the phone scene).
- Optional `examTip` on a chapter: a short Prüfungstipp for the oral B2 exam. It is plain text and is not glossary-checked.
- Optional `cheatsheet` on the lesson: `{ title, intro, steps: [{ n, title, phrases }] }`. The player prints it as an Ablauf-Spickzettel. Phrases are plain text.
- Optional `closing`: the sentence under “Ende des Kapitels”.

Also required: at least one quiz item per chapter (`pic`, `gap`, `reply`, `mc`), with `answer` inside `options`. Picture quizzes use `bp`, `ekg`, `spray` or `leg` until you add a drawing on `ART.quizPic`. Vocab `key` values must exist in the glossary. The “gelernt” checkbox is stored with `createProgressStore().saveComic`, next to grammar scores. The hero draws the first three character ids via `ART.cast`.

Run `npm run validate`. It checks both grammar lessons and comics.

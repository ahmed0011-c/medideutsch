# Lesson template

Lessons are JSON files under `content/lessons/<level>/`. Files whose names start with `_` (see `content/lessons/_template.json`) are validated but hidden from the course map.

The player renders one step type per screen. German sentences live only in the JSON. The interface chrome is English.

## Required shape

- `schemaVersion`: `1`
- `level`: `A1`, `A2`, `B1`, or `A1/A2`
- `scoring`: `firstTry` 2, `afterRetry` 1, `wordExplorePoints`, `hintCost` 1, `tipPoints` 1, star thresholds `0.9 / 0.7 / 0.4`
- `glossary`: every clickable word in an overview, a dialogue, or a reading
- `steps`: must include an `overview`

Lookup is exact, then lowercase. If a capitalised word should use a different entry, write `[[Surface|glossaryKey]]` (the ward-round lesson does this for `[[Morgen|morgen]]`).

## Step types

| type | What the learner does |
|---|---|
| `overview` | Goals, vocab cards, a short clickable reading. Optional “Show cases”. |
| `dialogue` | Scene, speakers, tap-to-translate lines, optional highlight. |
| `grammar` | Story, tables, warning, tips, multiple choice. |
| `cases` | Role cards, article table, step-by-step case animation. |
| `tips` | Collectible tip cards. Each “Got it” awards `tipPoints`. |
| `gapfill` | Drag or tap a chip into a gap. Chips are removed when used. |
| `gapcase` | Article gaps. Chips stay. Each item has a hint worth −1. |
| `builder` | Drag or tap tiles into order, then Check. |
| `picturematch` | Drag or tap a word onto a picture. |
| `colour` | Nominativ / Akkusativ / Dativ pens and an eraser. |
| `reading` | A document plus comprehension questions. |
| `compare` | Two pictured options. |
| `riddle` | Clues, then a guess, then the reveal line. |
| `writing` | A prompt, a checklist of keywords, and a model answer. |
| `summary` | Stars, section bars, redemittel. |

A hint is a string on the item (`hint`). Opening it stores `hints[hint:…]` and `pointsForAttempt` subtracts `hintCost` when the item is scored. It never goes below 0.

## Practice volume

Played lessons need enough practice to be learned, not only explained. The skeleton `_template.json` (`chapter` 0) is exempt. Every other lesson must have:

- at least 12 exercise steps and 60 scored items
- one step for each `practice` role: `match`, `gap`, `choose`, `build`, `transform`, `error`, `picture`, `dialogue`, `reading`, `writing`, `lernkontrolle`
- a `lernkontrolle` grammar quiz of at least 10 items

An exercise is a step with `practice` set, or a step of type `gapfill`, `gapcase`, `builder`, `picturematch`, `colour`, `compare`, `riddle`, `reading`, or `writing`. Overview, dialogue, summary, and untagged tips do not count. A grammar or cases step counts as an exercise only when it is tagged `choose` or `lernkontrolle`.

Items are the quiz questions, gap items, builder items, picture items, colour sentences, reading questions, and writing checklist lines on those steps.

The player marks the lesson mastered when at least 80% of the Lernkontrolle questions are solved (`progress.mc`). A hint does not block mastery. `completedAt` is stored on the lesson progress and shown on the summary and on the account page.

## Cases colours

Gender colours stay `der` blue, `die` red, `das` green. Case colours are separate: Nominativ amber, Akkusativ rose, Dativ purple, Genitiv teal. Do not paint Akkusativ blue.

Mark an example with `[N:der Arzt]`, `[A:den Patienten]`, `[D:dem Patienten]`, `[G:des Patienten]`.

## Wire a chapter

In `content/curriculum.ts`, set `LESSON[chapterNumber]` to the lesson id. Chapters 5–6 share one lesson, and so do 16–17. Run `npm run validate` before you commit.

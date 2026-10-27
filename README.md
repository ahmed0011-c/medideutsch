# MediDeutsch

German grammar from A1 to B1 for international medical students and doctors. Every dialogue, gap and reading is set in a hospital: a ward round, a drug round, a dressing, a handover.

The interface is English. The German is original. The chapter order follows a standard A1–B1 grammar sequence used here as a personal study map. It is not a copy of a textbook.

## Getting started

On Windows you can run MediDeutsch from the Cursor app. You only need Node.js.

1. Install the current Node.js LTS from [https://nodejs.org](https://nodejs.org). Use the Windows installer and leave **Add to PATH** checked. Quit Cursor and open it again so a new terminal can find `node` and `npm`.
2. In Cursor, choose **File → Open Folder** and select this project folder.
3. Open **Terminal → New Terminal**.
4. Install the dependencies, then start the app:

```bash
npm install
npm run dev
```

5. When the terminal says the server is ready, open [http://127.0.0.1:43123](http://127.0.0.1:43123) in your browser. Leave that terminal running while you use the app. Press Ctrl+C there when you want to stop it.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123). No account and no API key are required. Scores stay in this browser (`localStorage`).

Other checks:

```bash
npm run lint
npm run typecheck
npm run validate   # glossary and exercise structure
npm test
npm run build
```

## What you can play

| Chapters | Lesson |
|---|---|
| 1 | Personal pronouns on the ward |
| 2 | Present tense |
| 3 | sein, haben, möchten |
| 4 | Vowel-change verbs |
| 5–6 | Modal verbs (one lesson) |
| 7 | Separable verbs |
| 8 | Imperative |
| 16–17 | Cases: Nominativ, Akkusativ, Dativ, Genitiv |
| 40 | Connectors in position 0 (und, aber, oder, denn, sondern) |
| 41 | Connectors in position 1 (deshalb, sonst, dann, danach) |
| 42 | Subordinate clauses (weil, dass, wenn) |
| 43 | Place adverbs (da, dahin, daher) |
| 44 | Particles (denn, mal, doch) |
| 46 | Word formation (-chen, -lein, -er, -in, -ung) |
| 39 | Superlative (der kleinste, am schnellsten) |
| 49 | Simple past (kam, sah, sagte) |
| 50 | Past perfect (hatte geschlafen, war gekommen) |
| 51 | Dative reflexive (mir die Hände, sich weh) |
| 52 | Separable and inseparable verbs (kaufe ein, untersucht) |
| 53 | Verbs with prepositions (freut sich über, wartet auf) |
| 54 | Prepositional adverbs (darauf, worauf, daneben) |
| 55 | Konjunktiv II forms (hätte, wäre, würde) |
| 56 | Konjunktiv II use (wenn, wishes, advice) |
| 57 | Present passive (wird gereinigt, wird gegeben) |
| 58 | Past passive (wurde gereinigt, wurde durchgeführt) |
| 59 | Futur I and assumption (wird kommen, wird wohl schlafen) |
| 60 | Uses of werden (plan, passive, guess) |
| 61 | lassen (let him sleep, have the blood taken) |
| 62 | Position and direction (sitzen/setzen, liegen/legen, hängen) |
| 63 | Genitive (des Patienten, des Arztes, wegen des Fiebers) |
| 64 | N-declension (der Patient, den Herrn, dem Patienten) |
| 65 | Adjectives as people (der Jugendliche, ein Kranker) |
| 66 | Neuter adjective nouns (das Gute, etwas Neues, nichts Schlimmes) |
| 67 | Indirect questions (Wissen Sie, ob …?, wo der Schmerz ist) |

The course map lists all 80 chapters. A card without a link is planned; the topic and the ward situation are already written. Every A1 grammar chapter is playable, plus A2 chapters 21, 22, 25–29, 34–38, 40–44 and 46, and B1 chapters 39, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66 and 67. Each played lesson has at least 12 exercises and a final Lernkontrolle: 80% marks the lesson mastered. Open **Cases** in the header for the article table used by chapters 16 and 17. Akkusativ is rose so it stays distinct from the masculine article blue.

**Wortbank** keeps the words you star from a grammar popup or a comic popup. They stay grouped by the lesson you saved them in. Open Wortbank in the header to filter, mark a word Schwer, review it, or open a separable verb.

**Wortschatz** is the other half of the home page. Two comics are ready: “Übergabe am Morgen: Ein neuer Patient mit Brustschmerzen” (A2–B1) and “Das Aufnahmegespräch: Verdacht auf eine Beinvenenthrombose” (B1/B2, eight pages, with a Prüfungstipp on every page and a printable Ablauf-Spickzettel). Visite and Entlassung are listed as coming soon. How to add a comic is in `docs/AUTHORING.md`.

## Add a lesson

1. Copy `content/lessons/_template.json` to `content/lessons/a1/<id>.json` (or `a2` / `b1`). Files starting with `_` stay out of the catalog.
2. Follow `docs/LESSON_TEMPLATE.md` for the step types and `docs/AUTHORING.md` for the per-chapter checklist.
3. Point the chapter at the new id in `content/curriculum.ts`.
4. Run `npm run validate`. Every clickable word in an overview, a dialogue and a reading needs a glossary entry.

Hints cost 1 point. Drag-and-drop exercises also work by tapping a chip and then tapping the gap.

## GitHub Pages

The public site is [https://ahmed0011-c.github.io/medideutsch/](https://ahmed0011-c.github.io/medideutsch/). It is a separate repository from MediLearn. Local `npm run dev` stays at the site root. The Pages build sets `NEXT_PUBLIC_BASE_PATH=/medideutsch` so CSS, scripts, and links include that subpath.

```bash
npm run build:pages
```

That writes the static site to `out/`. Pushing `main` on `ahmed0011-c/medideutsch` runs `.github/workflows/pages.yml`, which publishes `out/`. Pages has to use **GitHub Actions** as the source. This repository is MediDeutsch only. Do not push it into `ahmed0011-c/medlearn`.

```bash
gh auth login
gh repo create ahmed0011-c/medideutsch --public --source=. --remote=github --push
gh api --method POST -H "Accept: application/vnd.github+json" /repos/ahmed0011-c/medideutsch/pages -f build_type=workflow
```

## Later

Accounts, saved progress in a database, and deployment are described in `docs/SUPABASE.md`. Stripe is not implemented. Guest play stays the default until you add it.

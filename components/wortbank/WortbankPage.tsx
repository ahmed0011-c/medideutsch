"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Illustration } from "@/components/illustrations";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MemoryCard } from "@/components/wortbank/MemoryCard";
import { SeparablePractice, Satzklammer } from "@/components/wortbank/SeparablePractice";
import { SeparableSplit } from "@/components/wortbank/SaveButtons";
import { VerbExplorer } from "@/components/wortbank/VerbExplorer";
import { lookupVerb } from "@/lib/verbs";
import { createProgressStore } from "@/lib/storage";
import {
  emptyWortbank,
  groupByLesson,
  notifyWortbank,
  posBucket,
  removeEntry,
  reviewQueue,
  reviewResult,
  setStory,
  toggleHard,
  type ReviewGrade,
  type WortbankDoc,
  type WortbankEntry,
} from "@/lib/wortbank";

type Mode = "bank" | "hard" | "separable" | "review";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "bank", label: "Wörter" },
  { id: "hard", label: "Schwere Wörter" },
  { id: "separable", label: "Trennbare Verben" },
  { id: "review", label: "Wiederholen" },
];

function writeDoc(doc: WortbankDoc) {
  createProgressStore().saveWortbank(doc);
  notifyWortbank();
}

export function WortbankPage() {
  const [doc, setDoc] = useState<WortbankDoc>(emptyWortbank());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("bank");
  const [query, setQuery] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [kind, setKind] = useState<"all" | "verb" | "noun" | "other">("all");
  const [hardOnly, setHardOnly] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [reviewHard, setReviewHard] = useState(false);
  const [reviewKey, setReviewKey] = useState(0);

  useEffect(() => {
    setDoc(createProgressStore().loadWortbank() ?? emptyWortbank());
    setReady(true);
  }, []);

  function commit(next: WortbankDoc) {
    setDoc(next);
    writeDoc(next);
  }

  const focus = doc.entries.find((entry) => entry.id === focusId) ?? null;
  const groups = useMemo(() => groupByLesson(doc.entries), [doc.entries]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return doc.entries.filter((entry) => {
      if ((mode === "hard" || hardOnly) && !entry.hard) return false;
      if (lessonId && entry.lessonId !== lessonId) return false;
      if (kind !== "all" && posBucket(entry.pos) !== kind) return false;
      if (!needle) return true;
      return [entry.de, entry.en, entry.lemma, entry.surface, entry.sentence, entry.lessonTitle]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [doc.entries, query, lessonId, kind, hardOnly, mode]);
  const visibleGroups = groupByLesson(visible);

  return (
    <>
      <SiteHeader />
      <main className="wb-page" id="wortbank">
        <p className="kicker">Your words</p>
        <h1 style={{ marginTop: 0 }}>Wortbank</h1>
        <p className="muted">
          Words you star while practising, kept with the lesson they came from. {doc.entries.length} saved
          {doc.entries.some((entry) => entry.hard) ? `, ${doc.entries.filter((entry) => entry.hard).length} marked Schwer` : ""}.
        </p>
        <div className="wb-tabs" role="tablist">
          {MODES.map((item) => (
            <button
              key={item.id}
              className={`btn btn-sm${mode === item.id ? " btn-primary" : " btn-ghost"}`}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => {
                setMode(item.id);
                setFocusId(null);
                if (item.id === "review") {
                  setReviewHard(false);
                  setReviewKey((value) => value + 1);
                }
              }}
            >
              {item.label}
              {item.id === "hard" ? ` (${doc.entries.filter((entry) => entry.hard).length})` : ""}
            </button>
          ))}
        </div>
        {!ready ? <p className="muted">Opening the Wortbank…</p> : null}
        {ready && mode === "separable" ? <SeparablePractice saved={doc.entries} /> : null}
        {ready && mode === "review" ? (
          <ReviewDeck key={reviewKey} doc={doc} onDoc={commit} initialHard={reviewHard} />
        ) : null}
        {ready && (mode === "bank" || mode === "hard") && focus ? (
          <WordDetail
            entry={focus}
            onBack={() => setFocusId(null)}
            onHard={() => commit(toggleHard(doc, focus.id))}
            onStory={(story) => commit(setStory(doc, focus.id, story))}
            onRemove={() => {
              commit(removeEntry(doc, focus.id));
              setFocusId(null);
            }}
          />
        ) : null}
        {ready && (mode === "bank" || mode === "hard") && !focus ? (
          <>
            <div className="wb-filters">
              <label className="wb-filter">
                Suche
                <input
                  value={query}
                  placeholder="Wort oder Satz"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="wb-filter">
                Lektion
                <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
                  <option value="">Alle Lektionen</option>
                  {groups.map((group) => (
                    <option key={group.lessonId} value={group.lessonId}>
                      {group.lessonTitle}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wb-filter">
                Wortart
                <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                  <option value="all">Alle</option>
                  <option value="verb">Verb</option>
                  <option value="noun">Nomen</option>
                  <option value="other">Andere</option>
                </select>
              </label>
              {mode === "bank" ? (
                <label className="wb-check">
                  <input
                    type="checkbox"
                    checked={hardOnly}
                    onChange={(event) => setHardOnly(event.target.checked)}
                  />
                  Nur Schwer
                </label>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => {
                    setReviewHard(true);
                    setReviewKey((value) => value + 1);
                    setMode("review");
                  }}
                >
                  Schwere Wörter wiederholen
                </button>
              )}
            </div>
            {!doc.entries.length ? (
              <div className="card wb-empty">
                <h2>Noch keine Wörter</h2>
                <p>
                  Tippe in einer Grammatiklektion oder einem Comic ein Wort an und drücke ⭐ Speichern. Die
                  Wörter landen hier, gruppiert nach der Lektion.
                </p>
                <p>
                  <Link href="/learn">Grammatik öffnen</Link>
                  {" · "}
                  <Link href="/wortschatz">Wortschatz öffnen</Link>
                </p>
              </div>
            ) : !visibleGroups.length ? (
              <div className="card wb-empty">
                <h2>Nichts passt zur Suche</h2>
                <p>Nimm einen Filter weg oder speichere das Wort in der Lektion.</p>
              </div>
            ) : (
              visibleGroups.map((group) => (
                <details key={group.lessonId} className="wb-group" open>
                  <summary>
                    <span>
                      {group.lessonKind === "comic" ? "Comic" : "Grammatik"} · {group.lessonTitle}
                    </span>
                    <b>{group.entries.length}</b>
                  </summary>
                  <ul>
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <button className="wb-word" type="button" onClick={() => setFocusId(entry.id)}>
                          <span className="emoji">{entry.image ? <Illustration id={entry.image} /> : entry.emoji || "🔤"}</span>
                          <span>
                            <strong>{entry.de}</strong>
                            <small>{entry.en}</small>
                          </span>
                        </button>
                        <button
                          className={`btn btn-ghost btn-sm${entry.hard ? " wb-hard" : ""}`}
                          type="button"
                          aria-pressed={entry.hard}
                          onClick={() => commit(toggleHard(doc, entry.id))}
                        >
                          {entry.hard ? "★ Schwer" : "☆ Schwer"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))
            )}
          </>
        ) : null}
      </main>
    </>
  );
}

function WordDetail({
  entry,
  onBack,
  onHard,
  onStory,
  onRemove,
}: {
  entry: WortbankEntry;
  onBack: () => void;
  onHard: () => void;
  onStory: (story: string) => void;
  onRemove: () => void;
}) {
  const verb = lookupVerb(entry.lemma);
  return (
    <article className="card wb-detail" data-testid="word-detail">
      <button className="btn btn-ghost btn-sm" type="button" onClick={onBack}>
        ← Zurück zur Liste
      </button>
      <header className="wb-detail-head">
        <span className="emoji">{entry.image ? <Illustration id={entry.image} /> : entry.emoji || "🔤"}</span>
        <div>
          <h2>
            {verb?.separable ? <SeparableSplit lemma={entry.lemma} /> : entry.de}
          </h2>
          <p>{entry.en}</p>
          <p className="muted">{entry.pos}</p>
        </div>
      </header>
      {entry.sentence ? <blockquote>{entry.sentence}</blockquote> : null}
      <div className="wb-inline">
        <Link className="btn btn-soft btn-sm" href={entry.href}>
          Zur Lektion
        </Link>
        <button className={`btn btn-ghost btn-sm${entry.hard ? " wb-hard" : ""}`} type="button" aria-pressed={entry.hard} onClick={onHard}>
          {entry.hard ? "★ Schwer" : "☆ Schwer"}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onRemove}>
          Entfernen
        </button>
      </div>
      {verb?.separable ? <Satzklammer lemma={entry.lemma} /> : null}
      {verb ? <VerbExplorer lemma={entry.lemma} /> : null}
      <MemoryCard lemma={entry.lemma} emoji={entry.emoji} story={entry.story} onStory={onStory} />
    </article>
  );
}

function ReviewDeck({
  doc,
  onDoc,
  initialHard,
}: {
  doc: WortbankDoc;
  onDoc: (doc: WortbankDoc) => void;
  initialHard: boolean;
}) {
  const groups = groupByLesson(doc.entries);
  const [lessonId, setLessonId] = useState("");
  const [hardOnly, setHardOnly] = useState(initialHard);
  const [flipped, setFlipped] = useState(false);
  const queue = useMemo(
    () =>
      reviewQueue(doc.entries, {
        lessonId: lessonId || undefined,
        hardOnly,
        includeLater: true,
      }),
    [doc.entries, lessonId, hardOnly],
  );
  const card = queue[0];

  function grade(next: ReviewGrade) {
    if (!card) return;
    const updated = reviewResult(card, next);
    onDoc({
      version: 1,
      entries: doc.entries.map((entry) => (entry.id === card.id ? updated : entry)),
    });
    setFlipped(false);
  }

  if (!doc.entries.length) {
    return (
      <div className="card wb-empty">
        <h2>Noch nichts zu wiederholen</h2>
        <p>Speichere zuerst ein Wort mit ⭐ Speichern.</p>
      </div>
    );
  }

  return (
    <section className="card wb-review" data-testid="flashcard-review">
      <div className="wb-filters">
        <label className="wb-filter">
          Lektion
          <select
            value={lessonId}
            onChange={(event) => {
              setLessonId(event.target.value);
              setFlipped(false);
            }}
          >
            <option value="">Alle</option>
            {groups.map((group) => (
              <option key={group.lessonId} value={group.lessonId}>
                {group.lessonTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="wb-check">
          <input
            type="checkbox"
            checked={hardOnly}
            onChange={(event) => {
              setHardOnly(event.target.checked);
              setFlipped(false);
            }}
          />
          Nur Schwer
        </label>
      </div>
      {!card ? (
        <p>Für diesen Filter liegt gerade keine Karte bereit.</p>
      ) : (
        <>
          <button className={`wb-card${flipped ? " show" : ""}`} type="button" onClick={() => setFlipped((value) => !value)}>
            <span className="emoji">{card.image ? <Illustration id={card.image} /> : card.emoji || "🔤"}</span>
            <strong>{flipped ? card.en : card.de}</strong>
            <small>{flipped ? card.sentence || card.lessonTitle : card.pos}</small>
            {card.hard ? <em>Schwer</em> : null}
          </button>
          <p className="muted">{queue.length} in dieser Runde · tippe die Karte für die Rückseite</p>
          <div className="wb-grades">
            <button className="btn btn-ghost" type="button" data-testid="grade-again" onClick={() => grade("again")}>
              Again
            </button>
            <button className="btn btn-soft" type="button" data-testid="grade-good" onClick={() => grade("good")}>
              Good
            </button>
            <button className="btn btn-primary" type="button" data-testid="grade-easy" onClick={() => grade("easy")}>
              Easy
            </button>
          </div>
        </>
      )}
    </section>
  );
}

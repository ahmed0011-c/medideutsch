"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Illustration } from "@/components/illustrations";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FlashcardsPractice, FlashFilterBar, RatingBadge } from "@/components/wortbank/Flashcards";
import { LearnerPanel, PrefixSplit } from "@/components/wortbank/LookupBox";
import { MemoryCard } from "@/components/wortbank/MemoryCard";
import { SeparablePractice, Satzklammer } from "@/components/wortbank/SeparablePractice";
import { SeparableSplit } from "@/components/wortbank/SaveButtons";
import { VerbExplorer } from "@/components/wortbank/VerbExplorer";
import { countDue, matchesFlashFilter, flashFilterCounts, type FlashFilter } from "@/lib/flashcards";
import { lookupVerb } from "@/lib/verbs";
import { createProgressStore } from "@/lib/storage";
import {
  emptyWortbank,
  groupByLesson,
  notifyWortbank,
  posBucket,
  removeEntry,
  setStory,
  toggleHard,
  type LessonKind,
  type WortbankDoc,
  type WortbankEntry,
} from "@/lib/wortbank";

type Mode = "bank" | "hard" | "separable" | "review";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "bank", label: "Wörter" },
  { id: "hard", label: "Schwere Wörter" },
  { id: "separable", label: "Trennbare Verben" },
  { id: "review", label: "Flashcards" },
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
  const [rateFilter, setRateFilter] = useState<FlashFilter>("all");
  const [focusId, setFocusId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setDoc(createProgressStore().loadWortbank() ?? emptyWortbank());
    setReady(true);
  }, []);

  function commit(next: WortbankDoc) {
    setDoc(next);
    writeDoc(next);
  }

  function lookupWord(word: string) {
    router.push(`/nachschlagen?q=${encodeURIComponent(word)}`);
  }

  const focus = doc.entries.find((entry) => entry.id === focusId) ?? null;
  const groups = useMemo(() => groupByLesson(doc.entries), [doc.entries]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return doc.entries.filter((entry) => {
      if ((mode === "hard" || hardOnly) && !entry.hard) return false;
      if (!matchesFlashFilter(entry, rateFilter)) return false;
      if (lessonId && entry.lessonId !== lessonId) return false;
      if (kind !== "all" && posBucket(entry.pos) !== kind) return false;
      if (!needle) return true;
      return [entry.de, entry.en, entry.lemma, entry.surface, entry.sentence, entry.lessonTitle]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [doc.entries, query, lessonId, kind, hardOnly, mode, rateFilter]);
  const visibleGroups = groupByLesson(visible);
  const due = countDue(doc.entries);

  return (
    <>
      <SiteHeader />
      <main className="wb-page" id="wortbank">
        <p className="kicker">Your words</p>
        <h1 style={{ marginTop: 0 }}>Wortbank</h1>
        <p className="muted">
          Words you star while practising, or look up yourself, kept with where they came from. {doc.entries.length} saved
          {doc.entries.some((entry) => entry.hard) ? `, ${doc.entries.filter((entry) => entry.hard).length} marked Schwer` : ""}.{" "}
          {due} due. <Link href="/nachschlagen">Look up a new word</Link>
        </p>
        <div className="fk-launch">
          <Link className="btn btn-primary" href="/wortbank/karten" data-testid="open-flashcards">
            Flashcards{due ? ` · ${due} due` : ""}
          </Link>
        </div>
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
              }}
            >
              {item.label}
              {item.id === "hard" ? ` (${doc.entries.filter((entry) => entry.hard).length})` : ""}
            </button>
          ))}
        </div>
        {!ready ? <p className="muted">Opening the Wortbank…</p> : null}
        {ready && mode === "separable" ? <SeparablePractice saved={doc.entries} /> : null}
        {ready && mode === "review" ? <FlashcardsPractice doc={doc} onChange={commit} /> : null}
        {ready && (mode === "bank" || mode === "hard") && focus ? (
          <WordDetail
            entry={focus}
            onBack={() => setFocusId(null)}
            onHard={() => commit(toggleHard(doc, focus.id))}
            onStory={(story) => commit(setStory(doc, focus.id, story))}
            onLookup={lookupWord}
            onRemove={() => {
              commit(removeEntry(doc, focus.id));
              setFocusId(null);
            }}
          />
        ) : null}
        {ready && (mode === "bank" || mode === "hard") && !focus ? (
          <>
            <FlashFilterBar value={rateFilter} counts={flashFilterCounts(doc.entries)} onChange={setRateFilter} />
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
                <button className="btn btn-primary btn-sm" type="button" onClick={() => setMode("review")}>
                  Practise with Flashcards
                </button>
              )}
            </div>
            {!doc.entries.length ? (
              <div className="card wb-empty">
                <h2>Noch keine Wörter</h2>
                <p>
                  Tippe in einer Grammatiklektion oder einem Comic ein Wort an und drücke ⭐ Speichern. Or look a word
                  up and add it here. The words stay grouped by where they came from.
                </p>
                <p>
                  <Link href="/nachschlagen">Look up a new word</Link>
                  {" · "}
                  <Link href="/learn">Grammatik öffnen</Link>
                  {" · "}
                  <Link href="/wortschatz">Wortschatz öffnen</Link>
                </p>
              </div>
            ) : !visibleGroups.length ? (
              <div className="card wb-empty">
                <h2>Nothing matches</h2>
                <p>Clear a filter, or save the word from a lesson.</p>
              </div>
            ) : (
              visibleGroups.map((group) => (
                <details key={group.lessonId} className="wb-group" open>
                  <summary>
                    <span>{groupLabel(group.lessonKind, group.lessonTitle)}</span>
                    <b>{group.entries.length}</b>
                  </summary>
                  <ul>
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <button className="wb-word" type="button" onClick={() => setFocusId(entry.id)}>
                          <span className="emoji">{entry.image ? <Illustration id={entry.image} /> : entry.emoji || "🔤"}</span>
                          <span>
                            <strong>
                              <WordLabel entry={entry} />
                            </strong>
                            <small>
                              <span>{entry.en || "No English gloss yet"}</span>
                              <RatingBadge rating={entry.rating} />
                              {entry.source === "Lookup" || entry.lessonKind === "lookup" ? (
                                <em className="lookup-source">Lookup</em>
                              ) : null}
                            </small>
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
  onLookup,
}: {
  entry: WortbankEntry;
  onBack: () => void;
  onHard: () => void;
  onStory: (story: string) => void;
  onRemove: () => void;
  onLookup: (word: string) => void;
}) {
  const verb = lookupVerb(entry.lemma);
  const fromLookup = entry.lessonKind === "lookup" || entry.source === "Lookup";
  return (
    <article className="card wb-detail" data-testid="word-detail">
      <button className="btn btn-ghost btn-sm" type="button" onClick={onBack}>
        ← Zurück zur Liste
      </button>
      <header className="wb-detail-head">
        <span className="emoji">{entry.image ? <Illustration id={entry.image} /> : entry.emoji || "🔤"}</span>
        <div>
          <h2>
            <WordLabel entry={entry} verbSeparable={Boolean(verb?.separable)} />
          </h2>
          {entry.meanings && entry.meanings.length > 1 ? (
            <ol className="lookup-meanings">
              {entry.meanings.map((meaning) => (
                <li key={meaning}>{meaning}</li>
              ))}
            </ol>
          ) : (
            <p>{entry.en}</p>
          )}
          <p className="muted">
            {entry.pos}
            {fromLookup ? <em className="lookup-source">Lookup</em> : null}
          </p>
        </div>
      </header>
      {hasLearnerFacts(entry) ? (
        <LearnerPanel
          lemma={entry.lemma}
          articles={entry.articles ?? (entry.article ? [entry.article] : [])}
          plural={entry.plural}
          ipa={entry.ipa}
          audio={entry.audio}
          separable={entry.separable}
          inseparable={entry.inseparable}
          praeteritum={entry.praeteritum}
          partizip={entry.partizip}
          aux={entry.aux}
          examples={entry.examples}
          related={entry.related}
          onRelated={onLookup}
          showSound
        />
      ) : null}
      {entry.sentence && !entry.examples?.some((example) => example.de === entry.sentence) ? (
        <blockquote>{entry.sentence}</blockquote>
      ) : null}
      <div className="wb-inline">
        <Link className="btn btn-soft btn-sm" href={fromLookup ? "/nachschlagen" : entry.href}>
          {fromLookup ? "Look up another" : "Zur Lektion"}
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

function groupLabel(kind: LessonKind, title: string): string {
  if (kind === "lookup") return "Lookup";
  const track = kind === "comic" ? "Comic" : kind === "hoeren" ? "Hören" : "Grammatik";
  return `${track} · ${title}`;
}

function hasLearnerFacts(entry: WortbankEntry): boolean {
  return Boolean(
    entry.lessonKind === "lookup" ||
      entry.source === "Lookup" ||
      entry.ipa ||
      entry.plural ||
      entry.praeteritum ||
      entry.partizip ||
      entry.audio ||
      entry.examples?.length ||
      entry.related?.length ||
      entry.separable !== undefined,
  );
}

function WordLabel({ entry, verbSeparable = false }: { entry: WortbankEntry; verbSeparable?: boolean }) {
  if (entry.separable && entry.prefix && entry.lemma.toLocaleLowerCase("de").startsWith(entry.prefix.toLocaleLowerCase("de"))) {
    return <PrefixSplit prefix={entry.prefix} lemma={entry.lemma} />;
  }
  if (verbSeparable) return <SeparableSplit lemma={entry.lemma} />;
  if (entry.article) {
    return (
      <>
        <span className={`art art-${entry.article}`}>{entry.article}</span> {entry.lemma}
      </>
    );
  }
  if (entry.articles && entry.articles.length > 1) {
    return (
      <>
        {entry.articles.map((article) => (
          <span key={article} className={`art art-${article}`}>
            {article}{" "}
          </span>
        ))}
        {entry.lemma}
      </>
    );
  }
  return <>{entry.de}</>;
}

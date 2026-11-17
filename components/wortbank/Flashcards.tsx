"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PrefixSplit } from "@/components/wortbank/LookupBox";
import {
  advanceSession,
  cardFace,
  countDue,
  emptyTally,
  FLASH_FILTERS,
  flashFilterCounts,
  isFlashFilter,
  scheduleFlashcard,
  sessionDone,
  startSession,
  type FlashFilter,
  type SessionTally,
} from "@/lib/flashcards";
import { useSpeech } from "@/lib/audio";
import { createProgressStore } from "@/lib/storage";
import {
  emptyWortbank,
  notifyWortbank,
  type FlashRating,
  type WortbankDoc,
  type WortbankEntry,
} from "@/lib/wortbank";

const RATING_LABEL: Record<FlashRating | "unrated", string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  unrated: "Unrated",
};

export function RatingBadge({ rating }: { rating?: FlashRating }) {
  const key = rating === "easy" || rating === "medium" || rating === "hard" ? rating : "unrated";
  return (
    <em className={`wb-rate wb-rate-${key}`} data-testid="rating-badge">
      {RATING_LABEL[key]}
    </em>
  );
}

export function FlashFilterBar({
  value,
  counts,
  onChange,
}: {
  value: FlashFilter;
  counts?: Record<FlashFilter, number>;
  onChange: (filter: FlashFilter) => void;
}) {
  return (
    <div className="wb-rate-row" role="group" aria-label="Rating filter">
      {FLASH_FILTERS.map((item) => (
        <button
          key={item.id}
          className={`btn btn-sm${value === item.id ? " btn-primary" : " btn-ghost"}`}
          type="button"
          aria-pressed={value === item.id}
          data-testid={`rate-filter-${item.id}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {counts ? ` ${counts[item.id]}` : ""}
        </button>
      ))}
    </div>
  );
}

export function FlashcardsScreen() {
  const [doc, setDoc] = useState<WortbankDoc>(emptyWortbank());
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<FlashFilter>("all");

  useEffect(() => {
    setDoc(createProgressStore().loadWortbank() ?? emptyWortbank());
    const value = new URLSearchParams(window.location.search).get("filter");
    if (isFlashFilter(value)) setFilter(value);
    setReady(true);
  }, []);

  function commit(next: WortbankDoc) {
    setDoc(next);
    createProgressStore().saveWortbank(next);
    notifyWortbank();
  }

  return (
    <>
      <SiteHeader />
      <main className="wb-page" id="flashcards">
        <p className="kicker">Practice</p>
        <h1 style={{ marginTop: 0 }}>Flashcards</h1>
        <p className="muted">
          <Link href="/wortbank">Back to Wortbank</Link>
        </p>
        {ready ? (
          <FlashcardsPractice doc={doc} onChange={commit} initialFilter={filter} />
        ) : (
          <p className="muted">Opening flashcards…</p>
        )}
      </main>
    </>
  );
}

export function FlashcardsPractice({
  doc,
  onChange,
  initialFilter = "all",
}: {
  doc: WortbankDoc;
  onChange: (doc: WortbankDoc) => void;
  initialFilter?: FlashFilter;
}) {
  const [filter, setFilter] = useState<FlashFilter>(initialFilter);
  const [phase, setPhase] = useState<"setup" | "run" | "done">("setup");
  const [ids, setIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [presses, setPresses] = useState<SessionTally>(emptyTally());
  const lock = useRef(false);
  const stateRef = useRef({ doc, ids, index, flipped, phase });
  stateRef.current = { doc, ids, index, flipped, phase };
  const rated = presses.easy + presses.medium + presses.hard;

  function grade(rating: FlashRating) {
    const current = stateRef.current;
    if (lock.current || current.phase !== "run" || !current.flipped) return;
    const id = current.ids[current.index];
    const entry = current.doc.entries.find((item) => item.id === id);
    if (!entry) return;
    lock.current = true;
    const updated = scheduleFlashcard(entry, rating);
    onChange({
      version: 1,
      entries: current.doc.entries.map((item) => (item.id === id ? updated : item)),
    });
    const advanced = advanceSession(current.ids, current.index, rating);
    setIds(advanced.ids);
    setIndex(advanced.index);
    setFlipped(false);
    setPresses((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    if (sessionDone(advanced.ids, advanced.index)) setPhase("done");
    queueMicrotask(() => {
      lock.current = false;
    });
  }

  const gradeRef = useRef(grade);
  gradeRef.current = grade;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const current = stateRef.current;
      if (current.phase !== "run") return;
      if (event.key === " " || event.code === "Space") {
        if (tag === "BUTTON" || tag === "A") return;
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }
      if (!current.flipped) return;
      const rating = event.key === "1" ? "easy" : event.key === "2" ? "medium" : event.key === "3" ? "hard" : null;
      if (!rating) return;
      event.preventDefault();
      gradeRef.current(rating);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = flashFilterCounts(doc.entries);
  const due = counts.due;
  const queued = startSession(doc.entries, filter).length;
  const cardId = ids[index];
  const card = doc.entries.find((entry) => entry.id === cardId);

  function begin() {
    const queue = startSession(doc.entries, filter);
    if (!queue.length) return;
    setIds(queue);
    setIndex(0);
    setFlipped(false);
    setPresses(emptyTally());
    setPhase("run");
  }

  return (
    <section className="fk-session" data-testid="flashcard-review">
      {phase === "setup" ? (
        <div className="card fk-setup">
          <h2>Practise your words</h2>
          <p>
            Every saved word is here, from lessons and from Look up. <b>{due}</b> {due === 1 ? "is" : "are"} due now.
          </p>
          <p className="muted">
            Hard comes back in this session and is due tomorrow. Medium is due in 3 days. Easy grows through 7, 14, 30,
            and 60 days.
          </p>
          {!doc.entries.length ? (
            <div className="wb-empty">
              <h2>No saved words yet</h2>
              <p>Star a word in a lesson, or look one up and add it to the Wortbank. Then practise it here.</p>
              <p>
                <Link href="/nachschlagen">Look up a word</Link>
                {" · "}
                <Link href="/learn">Open grammar</Link>
              </p>
            </div>
          ) : (
            <>
              <FlashFilterBar value={filter} counts={counts} onChange={setFilter} />
              <button className="btn btn-primary" type="button" data-testid="flashcards-start" disabled={!queued} onClick={begin}>
                {queued ? `Start · ${queued} ${queued === 1 ? "word" : "words"}` : "Nothing in this filter"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {phase === "run" && card ? (
        <FlashcardRun
          entry={card}
          flipped={flipped}
          left={ids.length - index}
          rated={rated}
          onFlip={() => setFlipped((value) => !value)}
          onGrade={grade}
        />
      ) : null}

      {phase === "done" ? (
        <div className="card fk-summary" data-testid="flashcard-summary">
          <h2>Session complete</h2>
          <p>
            You gave <b>{rated}</b> {rated === 1 ? "rating" : "ratings"}.
          </p>
          <ul className="fk-tally">
            <li>
              <b>{presses.easy}</b>
              <span>Easy</span>
            </li>
            <li>
              <b>{presses.medium}</b>
              <span>Medium</span>
            </li>
            <li>
              <b>{presses.hard}</b>
              <span>Hard</span>
            </li>
          </ul>
          <p className="muted">{countDue(doc.entries)} still due now.</p>
          <div className="fk-actions">
            <button className="btn btn-primary" type="button" onClick={() => setPhase("setup")}>
              Practise again
            </button>
            <Link className="btn btn-ghost" href="/wortbank">
              Back to Wortbank
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FlashcardRun({
  entry,
  flipped,
  left,
  rated,
  onFlip,
  onGrade,
}: {
  entry: WortbankEntry;
  flipped: boolean;
  left: number;
  rated: number;
  onFlip: () => void;
  onGrade: (rating: FlashRating) => void;
}) {
  const face = cardFace(entry);
  return (
    <div className="fk-run">
      <p className="fk-progress">
        {left} left in this round
        {rated ? ` · ${rated} rated` : ""}
        {entry.hard ? " · Schwer" : ""}
      </p>
      <div
        className={`fk-card${flipped ? " is-back" : ""}`}
        data-testid="flashcard"
        role="group"
        tabIndex={0}
        aria-label={flipped ? `Answer for ${face.word}` : `${face.speak || face.word}. Flip the card.`}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onFlip();
          }
        }}
      >
        {flipped ? <CardBack entry={entry} /> : <CardFront face={face} emoji={entry.emoji} />}
      </div>
      <p className="fk-hint muted">{flipped ? "1 Easy · 2 Medium · 3 Hard · Space flips" : "Tap the card or press Space"}</p>
      {flipped ? (
        <div className="fk-grades">
          <button className="btn fk-easy" type="button" data-testid="grade-easy" onClick={() => onGrade("easy")}>
            Easy <kbd>1</kbd>
          </button>
          <button className="btn fk-medium" type="button" data-testid="grade-medium" onClick={() => onGrade("medium")}>
            Medium <kbd>2</kbd>
          </button>
          <button className="btn fk-hard" type="button" data-testid="grade-hard" onClick={() => onGrade("hard")}>
            Hard <kbd>3</kbd>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CardFront({ face, emoji }: { face: ReturnType<typeof cardFace>; emoji: string }) {
  return (
    <>
      <span className="fk-emoji" aria-hidden="true">
        {emoji || "🔤"}
      </span>
      <strong className="fk-word" lang="de">
        {face.articles.map((article) => (
          <span key={article} className={`art art-${article}`}>
            {article}{" "}
          </span>
        ))}
        {face.word}
      </strong>
    </>
  );
}

function CardBack({ entry }: { entry: WortbankEntry }) {
  const face = cardFace(entry);
  const fromLookup = entry.lessonKind === "lookup" || entry.source === "Lookup";
  return (
    <div className="fk-back">
      <p className="fk-en" lang="en">
        {face.meanings.length ? face.meanings.join(" · ") : "No English meaning yet"}
        {fromLookup ? <em className="lookup-source">Lookup</em> : null}
      </p>
      {face.plural ? (
        <p className="fk-line">
          Plural <b lang="de">{face.plural}</b>
        </p>
      ) : null}
      {face.prefix ? <PrefixSplit prefix={face.prefix} lemma={face.word} /> : null}
      {face.praeteritum || face.partizip || face.aux ? (
        <dl className="lookup-facts fk-facts">
          {face.praeteritum ? (
            <div>
              <dt>Präteritum</dt>
              <dd lang="de">{face.praeteritum}</dd>
            </div>
          ) : null}
          {face.partizip ? (
            <div>
              <dt>Partizip II</dt>
              <dd lang="de">{face.partizip}</dd>
            </div>
          ) : null}
          {face.aux ? (
            <div>
              <dt>Hilfsverb</dt>
              <dd lang="de">{face.aux}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {face.exampleDe ? (
        <blockquote>
          <p lang="de">{face.exampleDe}</p>
          {face.exampleEn ? <p className="muted">{face.exampleEn}</p> : null}
        </blockquote>
      ) : null}
      <AudioButton audio={face.audio} text={face.speak || face.word} />
    </div>
  );
}

function AudioButton({ audio, text }: { audio?: string; text: string }) {
  const speech = useSpeech();
  const clip = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
  }, [audio]);

  useEffect(() => () => clip.current?.pause(), []);

  const canClip = Boolean(audio) && !failed;
  if (!canClip && !speech.supported) return null;

  function play(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    if (canClip && audio) {
      if (!clip.current) clip.current = new Audio();
      const element = clip.current;
      if (playing) {
        element.pause();
        setPlaying(false);
        return;
      }
      element.src = audio;
      element.onended = () => setPlaying(false);
      element.onerror = () => {
        setFailed(true);
        setPlaying(false);
        void speech.speak(text);
      };
      void element.play().then(
        () => setPlaying(true),
        () => {
          setFailed(true);
          void speech.speak(text);
        },
      );
      return;
    }
    void speech.speak(text);
  }

  return (
    <button className="btn btn-ghost btn-sm" type="button" data-testid="flashcard-audio" onClick={play}>
      {playing ? "Stop" : "Play"}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSpeech } from "@/lib/audio";
import { lookupGerman } from "@/lib/lookup-client";
import {
  findSavedEntry,
  lookupToDraft,
  type LookupCard,
  type LookupExample,
  type LookupSense,
  type LookupSuggestion,
} from "@/lib/lookup";
import type { Article, WortbankDraft, WortbankEntry } from "@/lib/wortbank";

export function LookupBox({
  entries,
  request,
  onAdd,
  onShow,
}: {
  entries: WortbankEntry[];
  request?: { id: number; word: string } | null;
  onAdd: (draft: WortbankDraft) => void;
  onShow: (id: string) => void;
}) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [card, setCard] = useState<LookupCard | null>(null);
  const [extras, setExtras] = useState<LookupCard[]>([]);
  const [suggestions, setSuggestions] = useState<LookupSuggestion[]>([]);
  const [senseIndex, setSenseIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  const run = useCallback(async (raw: string) => {
    const seq = ++requestSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const word = raw.trim();
    if (!word) {
      setStatus("error");
      setMessage("Type a German word to look it up.");
      setCard(null);
      setExtras([]);
      setSuggestions([]);
      return;
    }
    setStatus("loading");
    setMessage(`Looking up “${word}”…`);
    setCard(null);
    setExtras([]);
    setSuggestions([]);
    const result = await lookupGerman(word, controller.signal);
    if (seq !== requestSeq.current) return;
    if (!result.ok) {
      if (result.error === "aborted") return;
      setStatus("error");
      setCard(null);
      setExtras([]);
      setSuggestions(result.suggestions ?? []);
      setMessage(
        result.error === "offline"
          ? "You appear to be offline, or Wiktionary did not respond. Saved words stay on this device."
          : result.error === "empty"
            ? "Type a German word to look it up."
            : `No German entry for “${word}”. Check the spelling — nouns start with a capital letter.`,
      );
      return;
    }
    setCard(result.card);
    setExtras(result.extras ?? []);
    setSuggestions(result.card.suggestions ?? []);
    setSenseIndex(0);
    setStatus("done");
    setMessage("");
  }, []);

  useEffect(() => {
    if (!request) return;
    setInput(request.word);
    void run(request.word);
  }, [request, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sense = card?.senses[senseIndex] ?? card?.senses[0] ?? null;
  const saved = sense ? findSavedEntry(entries, sense) : undefined;

  return (
    <section className="card lookup" id="lookup">
      <form
        className="lookup-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run(input);
        }}
      >
        <label className="lookup-label" htmlFor="lookup-input">
          German word
          <input
            id="lookup-input"
            data-testid="lookup-input"
            value={input}
            lang="de"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Krankenhaus, abholen, die Tablette"
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" data-testid="lookup-submit" disabled={status === "loading"}>
          {status === "loading" ? "Looking up…" : "Look up"}
        </button>
      </form>
      <div aria-live="polite">
        {message ? <p className={status === "error" ? "lookup-error" : "muted"}>{message}</p> : null}
        {!card && suggestions.length ? (
          <DidYouMean
            items={suggestions}
            onPick={(word) => {
              setInput(word);
              void run(word);
            }}
          />
        ) : null}
        {card && sense ? (
          <>
            <LookupResult
              card={card}
              sense={sense}
              senseIndex={senseIndex}
              onSense={setSenseIndex}
              saved={saved}
              onAdd={() => onAdd(lookupToDraft(sense))}
              onShow={() => saved && onShow(saved.id)}
              onRelated={(word) => {
                setInput(word);
                void run(word);
              }}
            />
            {extras.map((extra) => {
              const extraSense = extra.senses[0];
              if (!extraSense) return null;
              const extraSaved = findSavedEntry(entries, extraSense);
              return (
                <LookupResult
                  key={`${extra.title}-${extraSense.pos}`}
                  card={{ ...extra, interpretation: undefined }}
                  sense={extraSense}
                  senseIndex={0}
                  onSense={() => undefined}
                  saved={extraSaved}
                  onAdd={() => onAdd(lookupToDraft(extraSense))}
                  onShow={() => extraSaved && onShow(extraSaved.id)}
                  onRelated={(word) => {
                    setInput(word);
                    void run(word);
                  }}
                />
              );
            })}
          </>
        ) : null}
      </div>
    </section>
  );
}

function LookupResult({
  card,
  sense,
  senseIndex,
  onSense,
  saved,
  onAdd,
  onShow,
  onRelated,
}: {
  card: LookupCard;
  sense: LookupSense;
  senseIndex: number;
  onSense: (index: number) => void;
  saved: WortbankEntry | undefined;
  onAdd: () => void;
  onShow: () => void;
  onRelated: (word: string) => void;
}) {
  return (
    <article className="lookup-card" data-testid="lookup-card">
      {card.interpretation ? (
        <p className="lookup-note" data-testid="lookup-interpretation">
          {card.interpretation}
        </p>
      ) : null}
      {card.also?.map((item) => (
        <p className="lookup-note" data-testid="lookup-also" key={`${item.form}-${item.lemma}`}>
          Also: {item.form} →{" "}
          <button type="button" onClick={() => onRelated(item.lemma)}>
            {item.lemma}
          </button>{" "}
          ({/verb|present|preterite|imperative|subjunctive|infinitive|participle|inflected/i.test(item.label) ? "verb form" : item.label})
        </p>
      ))}
      {card.source === "abbreviation" ? (
        <p className="lookup-note">Clinical abbreviation stored in the app. Nothing was looked up online.</p>
      ) : null}
      {card.source === "wikipedia" ? (
        <p className="lookup-note">
          German Wikipedia summary for a name or brand, not a learner dictionary entry. The English line is a machine translation.
        </p>
      ) : null}
      {card.source === "compound" ? (
        <p className="lookup-note">No dictionary entry for the whole word. The parts below are known; the combined line is a guess.</p>
      ) : null}
      {card.senses.length > 1 ? (
        <div className="lookup-senses" role="tablist" aria-label="Word class">
          {card.senses.map((item, index) => (
            <button
              key={`${item.pos}-${item.posLabel}-${index}`}
              className={`btn btn-sm${index === senseIndex ? " btn-primary" : " btn-ghost"}`}
              type="button"
              role="tab"
              aria-selected={index === senseIndex}
              onClick={() => onSense(index)}
            >
              {item.posLabel}
            </button>
          ))}
        </div>
      ) : null}
      <header className="lookup-head">
        <p className="lookup-pos">{sense.posLabel}</p>
        <h3 data-testid="lookup-headword">
          {sense.separable && sense.prefix ? (
            <PrefixSplit prefix={sense.prefix} lemma={sense.lemma} />
          ) : (
            <>
              {sense.articles.map((article) => (
                <span key={article} className={`art art-${article} lookup-article`}>
                  {article}
                </span>
              ))}
              {sense.lemma}
            </>
          )}
        </h3>
        <SoundRow ipa={sense.ipa} audio={sense.audio} speakText={sense.lemma} />
      </header>
      {card.partial ? (
        <p className="lookup-note">
          Wiktionary has no German entry for this word. This is a translation only, so article and verb forms are missing.
        </p>
      ) : null}
      {sense.meanings.length ? (
        <ol className="lookup-meanings">
          {sense.meanings.map((meaning) => (
            <li key={meaning}>{meaning}</li>
          ))}
        </ol>
      ) : (
        <p className="muted">No English sense found.</p>
      )}
      {sense.enSource === "mymemory" && card.source !== "wikipedia" ? (
        <p className="lookup-note">Wiktionary had no English sense, so this translation comes from MyMemory.</p>
      ) : null}
      {card.source === "abbreviation" && sense.germanGloss ? (
        <p className="lookup-gloss">
          <span>Stands for</span>
          {sense.germanGloss}
        </p>
      ) : null}
      {card.compound ? (
        <div className="lookup-compound" data-testid="lookup-compound">
          <ul>
            {card.compound.parts.map((part) => (
              <li key={part.word}>
                <b>{part.word}</b> — {part.en}
              </li>
            ))}
          </ul>
          <p data-testid="lookup-compound-guess">
            <span>Combined guess</span> {card.compound.guess}
          </p>
        </div>
      ) : null}
      {card.separableHints?.length ? (
        <div className="lookup-hints" data-testid="lookup-separable-hints">
          <span>Separable verbs</span>
          {card.separableHints.map((word) => (
            <button key={word} type="button" onClick={() => onRelated(word)}>
              {word}
            </button>
          ))}
        </div>
      ) : null}
      {card.suggestions?.length ? <DidYouMean items={card.suggestions} onPick={onRelated} /> : null}
      {!sense.meanings.length && sense.germanGloss && card.source !== "abbreviation" ? (
        <p className="lookup-gloss">
          <span>German definition</span>
          {sense.germanGloss}
        </p>
      ) : null}
      <LearnerPanel
        lemma={sense.lemma}
        articles={sense.articles}
        plural={sense.plural}
        separable={sense.separable}
        inseparable={sense.inseparable}
        praeteritum={sense.praeteritum}
        partizip={sense.partizip}
        aux={sense.aux}
        examples={sense.examples}
        related={sense.related}
        onRelated={onRelated}
      />
      <div className="lookup-actions">
        {saved ? (
          <>
            <button className="btn btn-soft wb-saved" type="button" data-testid="lookup-add" onClick={onShow}>
              Already in your Wortbank
            </button>
            <span className="lookup-source">Lookup</span>
          </>
        ) : (
          <>
            <button className="btn btn-primary" type="button" data-testid="lookup-add" onClick={onAdd}>
              Add to Wortbank
            </button>
            <span className="lookup-source">Saves with the source Lookup</span>
          </>
        )}
      </div>
    </article>
  );
}

export function DidYouMean({ items, onPick }: { items: LookupSuggestion[]; onPick: (lemma: string) => void }) {
  if (!items.length) return null;
  return (
    <p className="lookup-suggest" data-testid="lookup-suggest">
      <span>Did you mean</span>
      {items.map((item) => (
        <button key={`${item.lemma}-${item.label ?? ""}`} type="button" onClick={() => onPick(item.lemma)}>
          {item.lemma}
          {item.label ? ` (${item.label})` : ""}
        </button>
      ))}
    </p>
  );
}

export function PrefixSplit({ prefix, lemma }: { prefix: string; lemma: string }) {
  return (
    <span className="lookup-split" data-testid="lookup-split">
      <span className="wb-prefix">{lemma.slice(0, prefix.length)}</span>
      <span className="wb-pipe">|</span>
      <span>{lemma.slice(prefix.length)}</span>
    </span>
  );
}

export function LearnerPanel({
  lemma,
  articles,
  plural,
  ipa,
  audio,
  separable,
  inseparable,
  praeteritum,
  partizip,
  aux,
  examples,
  related,
  onRelated,
  showSound = false,
}: {
  lemma: string;
  articles?: Article[];
  plural?: string;
  ipa?: string;
  audio?: string;
  separable?: boolean;
  inseparable?: boolean;
  praeteritum?: string;
  partizip?: string;
  aux?: "haben" | "sein";
  examples?: LookupExample[];
  related?: string[];
  onRelated?: (word: string) => void;
  showSound?: boolean;
}) {
  const split = separable ? "separable" : inseparable ? "inseparable" : separable === false ? "none" : null;
  const showVerb = Boolean(split || praeteritum || partizip || aux);
  const showNoun = Boolean(plural);
  if (!showVerb && !showNoun && !examples?.length && !related?.length && !(showSound && (ipa || audio))) return null;
  return (
    <div className="lookup-panel">
      {showSound ? <SoundRow ipa={ipa} audio={audio} speakText={lemma} /> : null}
      {showNoun ? (
        <p className="lookup-plural" data-testid="lookup-plural">
          Plural <b>{plural}</b>
        </p>
      ) : null}
      {articles && articles.length > 1 ? (
        <p className="lookup-plural">
          Articles{" "}
          {articles.map((article) => (
            <b key={article} className={`art art-${article}`}>
              {article}{" "}
            </b>
          ))}
        </p>
      ) : null}
      {showVerb ? (
        <div className="lookup-verb" data-testid="lookup-verb">
          {split === "separable" ? <span className="lookup-badge lookup-badge-sep">Separable</span> : null}
          {split === "inseparable" ? <span className="lookup-badge">Inseparable</span> : null}
          {split === "none" ? <span className="lookup-badge lookup-badge-none">Does not split</span> : null}
          <dl className="lookup-facts">
            {praeteritum ? (
              <div>
                <dt>Präteritum</dt>
                <dd>{praeteritum}</dd>
              </div>
            ) : null}
            {partizip ? (
              <div>
                <dt>Partizip II</dt>
                <dd>{partizip}</dd>
              </div>
            ) : null}
            {aux ? (
              <div>
                <dt>Hilfsverb</dt>
                <dd>{aux}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
      {examples && examples.length ? (
        <ul className="lookup-examples">
          {examples.map((example) => (
            <li key={example.de}>
              <p>{example.de}</p>
              {example.en ? <p className="muted">{example.en}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {related && related.length ? (
        <div className="lookup-related">
          <span>Related</span>
          {related.map((word) =>
            onRelated ? (
              <button key={word} type="button" onClick={() => onRelated(word)}>
                {word}
              </button>
            ) : (
              <b key={word}>{word}</b>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function SoundRow({ ipa, audio, speakText }: { ipa?: string; audio?: string; speakText: string }) {
  const clip = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [clipFailed, setClipFailed] = useState(false);

  useEffect(() => {
    setClipFailed(false);
    setPlaying(false);
  }, [audio]);

  useEffect(() => () => clip.current?.pause(), []);

  if (!ipa && !audio) {
    return (
      <div className="lookup-sound">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => void createBrowserSpeech().speak(speakText)}>
          Speak
        </button>
      </div>
    );
  }

  return (
    <div className="lookup-sound">
      {ipa ? (
        <span className="lookup-ipa" data-testid="lookup-ipa">
          {ipa}
        </span>
      ) : null}
      {audio && !clipFailed ? (
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          data-testid="lookup-audio"
          onClick={() => {
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
              setClipFailed(true);
              setPlaying(false);
            };
            void element.play().then(() => setPlaying(true)).catch(() => setClipFailed(true));
          }}
        >
          {playing ? "Stop" : "Play"}
        </button>
      ) : null}
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void createBrowserSpeech().speak(speakText)}>
        Speak
      </button>
    </div>
  );
}

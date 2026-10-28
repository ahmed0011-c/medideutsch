"use client";

import { useEffect, useRef, useState } from "react";
import { Illustration } from "@/components/illustrations";
import { useLesson } from "@/lib/lesson-context";
import { caseSegments, plainText, tokenize } from "@/lib/tokens";
import type { McQuestion } from "@/lib/lesson-schema";
import { pointsForAttempt } from "@/lib/scoring";
import { lemmaFromGloss } from "@/lib/verbs";
import { grammarHref } from "@/lib/wortbank";
import { SeparableSplit, WortbankSaveButtons } from "@/components/wortbank/SaveButtons";

export function RichText({ html, className }: { html: string; className?: string }) {
  const safe = html.replace(/<(?!\/?(b|i|br)\b)[^>]*>/gi, "");
  return <span className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function CaseMarks({ text }: { text: string }) {
  return (
    <>
      {caseSegments(text).map((part, i) =>
        part.caseId ? (
          <mark key={i} className={`cm cm-${part.caseId}`}>
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function ClickableText({
  text,
  explore = false,
  sentence,
}: {
  text: string;
  explore?: boolean;
  sentence?: string;
}) {
  const { lesson, progress, openPop, closePop, pop, markSeen } = useLesson();
  const said = sentence ?? plainText(text);
  return (
    <>
      {tokenize(text, lesson.glossary).map((token, i) => {
        if (token.type === "text") return <span key={i}>{token.value}</span>;
        if (!token.key) return <span key={i}>{token.surface}</span>;
        const entry = lesson.glossary[token.key];
        const active = pop?.key === token.key;
        const classes = [
          "w",
          entry.case ? `case-${entry.case.c}` : "",
          /modal/i.test(entry.pos) ? "modal" : "",
          progress.seen[token.key] ? "seen" : "",
          active ? "active" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={i}
            type="button"
            className={classes}
            onClick={(event) => {
              event.stopPropagation();
              if (active) {
                closePop();
                return;
              }
              markSeen(token.key!, event.currentTarget, explore);
              openPop(token.key!, event.currentTarget, said);
            }}
          >
            {token.surface}
          </button>
        );
      })}
    </>
  );
}

export function WordPopover() {
  const { lesson, pop, progress, closePop, speak } = useLesson();
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePop]);

  useEffect(() => {
    if (!pop || !ref.current) return;
    const node = ref.current;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    if (window.innerWidth <= 560) return;
    const left = Math.min(Math.max(10, pop.x - width / 2), window.innerWidth - width - 10);
    let top = pop.y + 10;
    if (top + height > window.innerHeight - 80) top = Math.max(70, pop.y - height - 28);
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  }, [pop, tick]);

  if (!pop) return null;
  const entry = lesson.glossary[pop.key];
  if (!entry) return null;
  const isNoun = Boolean(entry.article);
  const lemma = entry.de.replace(/ \(.*\)$/, "");
  const sayWord = isNoun ? `${entry.article} ${lemma}` : pop.surface;
  const info = lesson.cases && entry.case ? lesson.cases[entry.case.c] : undefined;

  return (
    <div
      ref={ref}
      className="pop open"
      role="dialog"
      aria-label={entry.de}
      style={{ left: 12, top: 80 }}
    >
      <button className="close" type="button" aria-label="Close" onClick={closePop}>
        ✕
      </button>
      <div className="pop-head">
        <div className="pic emoji">
          {entry.image?.type === "svg" ? <Illustration id={entry.image.id} /> : (entry.emoji ?? "🔤")}
        </div>
        <div>
          <div className="word">
            {isNoun ? (
              <>
                <span className={`art art-${entry.article}`}>{entry.article}</span> {lemma}
              </>
            ) : (
              entry.de
            )}
          </div>
          <span className="pos">{entry.pos}</span>
        </div>
      </div>
      <div className="en">{entry.en}</div>
      {isNoun && entry.plural ? (
        <div className="pl">
          Plural: <b>{entry.plural}</b>
        </div>
      ) : null}
      {!isNoun && entry.de.toLowerCase() !== sayWord.toLowerCase() ? (
        <div className="pl">
          Dictionary form: <b>{entry.de}</b>
        </div>
      ) : null}
      {entry.case && info ? (
        <div className={`casebox c-${entry.case.c}`}>
          <div className="cb-row">
            <span className="cbadge">{info.name}</span>
            <span className="gbadge">{entry.case.gender}</span>
          </div>
          {entry.case.text}
        </div>
      ) : null}
      {entry.note ? <div className="note">💡 {entry.note}</div> : null}
      <SeparableSplit lemma={lemmaFromGloss(entry.de, entry.pos)} />
      <div className="actions">
        <button className="btn btn-soft btn-sm" type="button" onClick={() => void speak(sayWord)}>
          🔊 Word
        </button>
        {pop.sentence ? (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void speak(pop.sentence!)}>
            🔊 Sentence
          </button>
        ) : null}
        <WortbankSaveButtons
          draft={{
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonKind: "grammar",
            key: pop.key,
            surface: pop.surface,
            lemma: lemmaFromGloss(entry.de, entry.pos),
            pos: entry.pos,
            de: entry.article
              ? `${entry.article} ${entry.de.split("→")[0].replace(/\s*\(.*\)$/, "").trim()}`
              : /^verb/i.test(entry.pos)
                ? lemmaFromGloss(entry.de, entry.pos)
                : entry.de.split("→")[0].replace(/\s*\(.*\)$/, "").trim(),
            en: entry.en,
            emoji: entry.emoji ?? "🔤",
            image: entry.image?.type === "svg" ? entry.image.id : undefined,
            sentence: pop.sentence ?? "",
            href: grammarHref(lesson.level, lesson.id, progress.stepIndex),
          }}
          onChange={() => setTick((value) => value + 1)}
        />
      </div>
    </div>
  );
}

export function HintButton({
  hintKey,
  text,
  disabled,
}: {
  hintKey: string;
  text: string;
  disabled?: boolean;
}) {
  const { progress, patch, toast, lesson } = useLesson();
  const used = Boolean(progress.hints[hintKey]);
  if (used) {
    return (
      <>
        <button className="hint-btn" type="button" disabled>
          💡 Hint used
        </button>
        <div className="hintbox">💡 {text}</div>
      </>
    );
  }
  return (
    <button
      className="hint-btn"
      type="button"
      disabled={disabled}
      onClick={() => {
        patch((current) => ({
          ...current,
          hints: { ...current.hints, [hintKey]: true },
        }));
        toast(`Hint used: this item is worth ${lesson.scoring.hintCost} point less.`);
      }}
    >
      💡 Hint <small>−{lesson.scoring.hintCost} ⭐</small>
    </button>
  );
}

export function McBlock({
  question,
  itemKey,
}: {
  question: McQuestion;
  itemKey: string;
}) {
  const { progress, patch, award, lesson } = useLesson();
  const state = progress.mc[itemKey] ?? { wrong: [], solved: false };
  const hintKey = `hint:${itemKey}`;

  function choose(index: number, anchor: HTMLElement) {
    if (state.solved) return;
    if (index === question.answer) {
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: state.wrong.length > 0,
        hintUsed: Boolean(progress.hints[hintKey]),
      });
      patch((current) => ({
        ...current,
        mc: { ...current.mc, [itemKey]: { wrong: state.wrong, solved: true } },
      }));
      award(itemKey, points, anchor);
    } else if (!state.wrong.includes(index)) {
      patch((current) => ({
        ...current,
        mc: {
          ...current.mc,
          [itemKey]: { wrong: [...state.wrong, index], solved: false },
        },
      }));
    }
  }

  return (
    <div className="q">
      <div className="qt">{question.q}</div>
      {question.qEn ? <div className="qen">{question.qEn}</div> : null}
      <div className="opts">
        {question.options.map((option, index) => {
          const wrong = state.wrong.includes(index);
          const right = state.solved && index === question.answer;
          return (
            <button
              key={option}
              type="button"
              className={`opt${right ? " right" : ""}${wrong ? " wrong" : ""}`}
              disabled={state.solved || wrong}
              onClick={(event) => choose(index, event.currentTarget)}
            >
              {question.kind === "tf" ? (index === 0 ? "✔ " : "✘ ") : ""}
              {option}
            </button>
          );
        })}
      </div>
      {question.hint ? (
        <div style={{ marginTop: 8 }}>
          <HintButton hintKey={hintKey} text={question.hint} disabled={state.solved} />
        </div>
      ) : null}
      {state.solved ? (
        <div className="fb ok" role="status">
          ✓ Richtig! {question.why}
        </div>
      ) : state.wrong.length ? (
        <div className="fb bad" role="status">
          ✗ Not quite. Try again!
        </div>
      ) : null}
    </div>
  );
}

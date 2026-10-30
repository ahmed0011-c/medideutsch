"use client";

import { useMemo, useState } from "react";
import type { SentenceWriteStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { pointsForAttempt } from "@/lib/scoring";
import { diagnoseSentence, sentenceAccepted } from "@/lib/sentence-check";
import { ClickableText } from "@/components/lesson/bits";
import { HintButton } from "@/components/lesson/bits";

type ItemState = {
  text: string;
  status: "idle" | "ok" | "bad";
  feedback?: ReturnType<typeof diagnoseSentence>;
};

export function SentenceWriteStepView({ step }: { step: SentenceWriteStep }) {
  const { progress, patch, award, lesson, speak } = useLesson();
  const saved = progress.writing[step.id] ?? { text: "", awarded: {}, tries: 0 };
  const drafts: Record<string, string> = (saved as { drafts?: Record<string, string> }).drafts ?? {};
  const [local, setLocal] = useState<Record<number, ItemState>>(() => {
    const init: Record<number, ItemState> = {};
    step.items.forEach((_, i) => {
      init[i] = {
        text: drafts[String(i)] ?? "",
        status: saved.awarded[String(i)] ? "ok" : "idle",
      };
    });
    return init;
  });

  const done = useMemo(
    () => step.items.filter((_, i) => Boolean(saved.awarded[String(i)])).length,
    [step.items, saved.awarded],
  );

  function setDraft(index: number, text: string) {
    setLocal((cur) => ({ ...cur, [index]: { ...cur[index], text, status: "idle", feedback: undefined } }));
    patch((current) => {
      const prev = current.writing[step.id] ?? { text: "", awarded: {}, tries: 0 };
      const prevDrafts = (prev as { drafts?: Record<string, string> }).drafts ?? {};
      return {
        ...current,
        writing: {
          ...current.writing,
          [step.id]: {
            ...prev,
            drafts: { ...prevDrafts, [String(index)]: text },
          },
        },
      };
    });
  }

  function check(index: number, anchor: HTMLElement) {
    const item = step.items[index];
    const state = local[index];
    if (!item || !state || saved.awarded[String(index)]) return;
    const ok = sentenceAccepted(state.text, item.answers);
    const hintKey = `hint:${step.id}:${index}`;
    if (ok) {
      const tries = (progress.gapTries[`${step.id}:${index}`] ?? 0);
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: tries > 0,
        hintUsed: Boolean(progress.hints[hintKey]),
      });
      patch((current) => {
        const prev = current.writing[step.id] ?? { text: "", awarded: {}, tries: 0 };
        return {
          ...current,
          writing: {
            ...current.writing,
            [step.id]: {
              ...prev,
              awarded: { ...prev.awarded, [String(index)]: 1 },
              tries: prev.tries + 1,
            },
          },
        };
      });
      award(`write:${step.id}:${index}`, points, anchor);
      setLocal((cur) => ({
        ...cur,
        [index]: { ...cur[index], status: "ok", feedback: undefined },
      }));
      return;
    }
    patch((current) => ({
      ...current,
      gapTries: {
        ...current.gapTries,
        [`${step.id}:${index}`]: (current.gapTries[`${step.id}:${index}`] ?? 0) + 1,
      },
    }));
    const feedback = diagnoseSentence(state.text, item.answers[0], item.marks ?? []);
    setLocal((cur) => ({
      ...cur,
      [index]: { ...cur[index], status: "bad", feedback },
    }));
  }

  return (
    <div>
      <div className="instructions">
        <span className="emoji">✍️</span>
        <span>{step.instructions}</span>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        Gelöst: {done}/{step.items.length}
      </p>
      <div className="sw-list">
        {step.items.map((item, index) => {
          const state = local[index] ?? { text: "", status: "idle" as const };
          const solved = Boolean(saved.awarded[String(index)]) || state.status === "ok";
          const model = item.answers[0];
          return (
            <div key={`${step.id}-${index}`} className={`card sw-card${solved ? " sw-ok" : ""}`}>
              <div className="sw-cue">
                <span className="sw-num">{index + 1}</span>
                <ClickableText text={item.cue} sentence={model} />
              </div>
              <input
                className={`sw-input${state.status === "bad" ? " sw-bad" : ""}${solved ? " sw-done" : ""}`}
                value={state.text}
                disabled={solved}
                aria-label={`Satz ${index + 1}`}
                placeholder="Schreiben Sie den ganzen Satz …"
                onChange={(e) => setDraft(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    check(index, e.currentTarget);
                  }
                }}
              />
              <div className="bactions">
                {!solved ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={(e) => check(index, e.currentTarget)}
                  >
                    Prüfen
                  </button>
                ) : (
                  <span className="ok-chip">✓ Richtig</span>
                )}
                {item.hint ? <HintButton hintKey={`hint:${step.id}:${index}`} text={item.hint} /> : null}
              </div>
              {state.status === "bad" && state.feedback ? (
                <div className="sw-feedback" aria-live="polite">
                  <p className="sw-feedback-label">Markierung</p>
                  <p className="sw-tokens">
                    {state.feedback.map((tok, i) => (
                      <span
                        key={`${i}-${tok.text}`}
                        className={
                          tok.kind === "ok" ? "sw-tok ok" : tok.kind === "bad" ? "sw-tok bad" : "sw-tok miss"
                        }
                        title={tok.kind === "ok" ? undefined : tok.reason}
                      >
                        {tok.kind === "missing" ? `⌊${tok.text}⌋` : tok.text}
                      </span>
                    ))}
                  </p>
                  <ul className="sw-reasons">
                    {state.feedback
                      .filter((t) => t.kind !== "ok")
                      .map((t, i) => (
                        <li key={`r-${i}`}>{t.reason}</li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {solved ? (
                <div className="sw-model">
                  <div className="sw-model-row">
                    <b>Lösung</b>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => speak(model)}
                      aria-label="Satz anhören"
                    >
                      🔊 Anhören
                    </button>
                  </div>
                  <p>
                    <ClickableText text={model} sentence={model} />
                  </p>
                  {item.en ? <p className="muted">{item.en}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

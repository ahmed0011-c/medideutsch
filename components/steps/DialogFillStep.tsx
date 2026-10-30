"use client";

import { useMemo } from "react";
import type { DialogFillStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { pointsForAttempt } from "@/lib/scoring";
import { ClickableText } from "@/components/lesson/bits";

type GapPart = {
  gap: true;
  options: [string, string];
  answer: 0 | 1;
  why: string;
};

function isGap(part: { text: string } | GapPart): part is GapPart {
  return "gap" in part && part.gap === true;
}

export function DialogFillStepView({ step }: { step: DialogFillStep }) {
  const { progress, patch, award, lesson, speak } = useLesson();

  const gapKeys = useMemo(() => {
    const keys: string[] = [];
    step.lines.forEach((line, li) => {
      line.parts.forEach((part, pi) => {
        if (isGap(part)) keys.push(`${step.id}:${li}:${pi}`);
      });
    });
    return keys;
  }, [step]);

  const done = gapKeys.filter((k) => progress.gapDone[k]).length;
  const allDone = done === gapKeys.length && gapKeys.length > 0;

  function pick(li: number, pi: number, choice: 0 | 1, anchor: HTMLElement) {
    const part = step.lines[li]?.parts[pi];
    if (!part || !isGap(part)) return;
    const key = `${step.id}:${li}:${pi}`;
    if (progress.gapDone[key]) return;
    const hintKey = `hint:${key}`;
    if (choice === part.answer) {
      const tries = progress.gapTries[key] ?? 0;
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: tries > 0,
        hintUsed: Boolean(progress.hints[hintKey]),
      });
      patch((current) => ({
        ...current,
        gapDone: { ...current.gapDone, [key]: true },
      }));
      award(`dialogfill:${step.id}:${li}:${pi}`, points, anchor);
      return;
    }
    patch((current) => ({
      ...current,
      gapTries: { ...current.gapTries, [key]: (current.gapTries[key] ?? 0) + 1 },
      wrong: {
        ...current.wrong,
        [key]: [...(current.wrong[key] ?? []), choice],
      },
    }));
  }

  function fullText(): string {
    return step.lines
      .map((line) => {
        const name = step.speakers[line.who]?.name ?? line.who;
        const body = line.parts
          .map((part) => (isGap(part) ? part.options[part.answer] : part.text))
          .join("");
        return `${name}: ${body}`;
      })
      .join(". ");
  }

  return (
    <div>
      <div className="instructions">
        <span className="emoji">💬</span>
        <span>{step.instructions}</span>
      </div>
      {step.sceneTitle || step.scene ? (
        <div className="df-scene card">
          {step.sceneTitle ? <h3 style={{ margin: "0 0 4px" }}>{step.sceneTitle}</h3> : null}
          {step.scene ? <p className="muted" style={{ margin: 0 }}>{step.scene}</p> : null}
        </div>
      ) : null}
      <p className="muted">Lücken: {done}/{gapKeys.length}</p>
      <div className="df-dialog" role="list">
        {step.lines.map((line, li) => {
          const speaker = step.speakers[line.who];
          return (
            <div key={`${step.id}-l${li}`} className="df-line" role="listitem">
              <div className="df-who">
                <span className="df-avatar" aria-hidden>
                  {speaker?.avatar ?? "👤"}
                </span>
                <div>
                  <b>{speaker?.name ?? line.who}</b>
                  {speaker?.role ? <span className="muted"> · {speaker.role}</span> : null}
                </div>
              </div>
              <p className="df-text">
                {line.parts.map((part, pi) => {
                  if (!isGap(part)) {
                    return (
                      <ClickableText key={`t-${li}-${pi}`} text={part.text} />
                    );
                  }
                  const key = `${step.id}:${li}:${pi}`;
                  const solved = Boolean(progress.gapDone[key]);
                  const wrongs = progress.wrong[key] ?? [];
                  if (solved) {
                    return (
                      <span key={key} className="df-gap filled">
                        {part.options[part.answer]}
                      </span>
                    );
                  }
                  return (
                    <span key={key} className="df-gap-opts" role="group" aria-label="Endung wählen">
                      {part.options.map((opt, oi) => {
                        const wasWrong = wrongs.includes(oi);
                        return (
                          <button
                            key={`${key}-${oi}`}
                            type="button"
                            className={`df-opt${wasWrong ? " wrong" : ""}`}
                            disabled={wasWrong}
                            onClick={(e) => pick(li, pi, oi as 0 | 1, e.currentTarget)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {wrongs.length > 0 ? (
                        <span className="df-why muted">{part.why}</span>
                      ) : null}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="df-listen">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!allDone}
          onClick={() => speak(fullText())}
        >
          🔊 {step.listenLabel ?? "Dialog anhören"}
        </button>
        {!allDone ? (
          <span className="muted">Zuerst alle Lücken lösen.</span>
        ) : (
          <span className="ok-chip">✓ Dialog fertig</span>
        )}
      </div>
    </div>
  );
}

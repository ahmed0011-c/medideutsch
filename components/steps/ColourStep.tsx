"use client";

import { useState } from "react";
import type { ColourStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { pointsForAttempt } from "@/lib/scoring";

const PENS = ["N", "A", "D"] as const;

export function ColourStepView({ step }: { step: ColourStep }) {
  const { lesson, progress, patch } = useLesson();
  const cases = lesson.cases;
  if (!cases) return null;
  const pen = progress.pen || "N";

  return (
    <div>
      <div className="instructions">
        <span className="emoji">🖍️</span>
        <span>{step.instructions}</span>
      </div>
      <div className="pens">
        <span className="lbl">Pen</span>
        {PENS.map((id) => (
          <button
            key={id}
            type="button"
            className={`pen c-${id}${pen === id ? " active" : ""}`}
            onClick={() => patch((current) => ({ ...current, pen: id }))}
          >
            <span className="dot" />
            {cases[id].name} <small>{cases[id].q}</small>
          </button>
        ))}
        <button
          type="button"
          className={`pen eraser${pen === "E" ? " active" : ""}`}
          onClick={() => patch((current) => ({ ...current, pen: "E" }))}
        >
          Eraser
        </button>
      </div>
      {step.sentences.map((sentence, index) => (
        <ColourSentence key={sentence.en} step={step} index={index} />
      ))}
    </div>
  );
}

function ColourSentence({ step, index }: { step: ColourStep; index: number }) {
  const sentence = step.sentences[index];
  const { lesson, progress, patch, award, toast } = useLesson();
  const cases = lesson.cases!;
  const solved = Boolean(progress.coloured[`${step.id}:${index}`]);
  const [shake, setShake] = useState<number | null>(null);
  const pen = progress.pen || "N";

  function markKey(part: number) {
    return `${step.id}:${index}:${part}`;
  }

  function paint(part: number) {
    if (solved) return;
    const phrase = sentence.parts[part];
    if (typeof phrase === "string") return;
    const key = markKey(part);
    if (pen === "E") {
      patch((current) => {
        const marks = { ...current.marks };
        delete marks[key];
        return { ...current, marks };
      });
      return;
    }
    patch((current) => ({ ...current, marks: { ...current.marks, [key]: pen } }));
  }

  function check(anchor: HTMLElement) {
    const phrases = sentence.parts
      .map((part, partIndex) => ({ part, partIndex }))
      .filter((entry): entry is { part: Exclude<(typeof sentence.parts)[number], string>; partIndex: number } => typeof entry.part !== "string");
    if (phrases.some(({ partIndex }) => !progress.marks[markKey(partIndex)])) {
      toast("Colour every phrase, then press Check.");
      return;
    }
    const wrong = phrases.find(({ part, partIndex }) => progress.marks[markKey(partIndex)] !== part.c);
    if (!wrong) {
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: (progress.colourTries[`${step.id}:${index}`] ?? 0) > 0,
        hintUsed: false,
      });
      patch((current) => ({
        ...current,
        coloured: { ...current.coloured, [`${step.id}:${index}`]: true },
      }));
      award(`c:${step.id}:${index}`, points, anchor);
      return;
    }
    patch((current) => ({
      ...current,
      colourTries: {
        ...current.colourTries,
        [`${step.id}:${index}`]: (current.colourTries[`${step.id}:${index}`] ?? 0) + 1,
      },
    }));
    setShake(wrong.partIndex);
    window.setTimeout(() => setShake(null), 450);
    toast(wrong.part.why);
  }

  return (
    <div className={`csent${solved ? " solved" : ""}`}>
      <div className="row">
        {sentence.parts.map((part, partIndex) => {
          if (typeof part === "string") return <span key={partIndex}>{part}</span>;
          const mark = solved ? part.c : progress.marks[markKey(partIndex)];
          return (
            <button
              key={partIndex}
              type="button"
              className={`np${mark ? ` m-${mark} c-${mark}` : ""}${shake === partIndex ? " x" : ""}${solved ? " ok" : ""}`}
              data-tag={mark ? cases[mark as "N" | "A" | "D"].short : undefined}
              onClick={() => paint(partIndex)}
            >
              {part.t}
            </button>
          );
        })}
      </div>
      <div className="foot">
        <span className="en">{sentence.en}</span>
        {solved ? (
          <span className="fb ok" style={{ margin: 0 }}>
            ✓ Cases match.
          </span>
        ) : (
          <button className="btn btn-primary" type="button" onClick={(event) => check(event.currentTarget)}>
            Check
          </button>
        )}
      </div>
    </div>
  );
}

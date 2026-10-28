"use client";

import { useState } from "react";
import type { CompareStep, RiddleStep, WritingStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { ClickableText, HintButton } from "@/components/lesson/bits";
import { Illustration } from "@/components/illustrations";
import { pointsForAttempt } from "@/lib/scoring";

export function CompareStepView({ step }: { step: CompareStep }) {
  const { progress, patch, award, lesson } = useLesson();
  return (
    <div>
      <div className="instructions">
        <span className="emoji">⚖️</span>
        <span>{step.instructions}</span>
      </div>
      {step.items.map((item, index) => {
        const key = `${step.id}:${index}`;
        const solved = Boolean(progress.solved[key]);
        const wrong = progress.wrong[key] ?? [];
        return (
          <div key={item.prompt} className="card">
            <h2>
              <ClickableText text={item.prompt} />
            </h2>
            <div className="compare-grid">
              {item.options.map((option, optionIndex) => {
                const right = solved && optionIndex === item.answer;
                const bad = wrong.includes(optionIndex);
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`choice${right ? " right" : ""}${bad ? " wrong" : ""}`}
                    disabled={solved || bad}
                    onClick={(event) => {
                      if (optionIndex === item.answer) {
                        const points = pointsForAttempt(lesson.scoring, {
                          wrongBefore: wrong.length > 0,
                          hintUsed: Boolean(progress.hints[`hint:${key}`]),
                        });
                        patch((current) => ({ ...current, solved: { ...current.solved, [key]: true } }));
                        award(`compare:${step.id}:${index}`, points, event.currentTarget);
                      } else if (!wrong.includes(optionIndex)) {
                        patch((current) => ({
                          ...current,
                          wrong: { ...current.wrong, [key]: [...wrong, optionIndex] },
                        }));
                      }
                    }}
                  >
                    {option.image?.type === "svg" ? (
                      <span className="big">
                        <Illustration id={option.image.id} />
                      </span>
                    ) : (
                      <span className="big emoji">{option.emoji ?? "🩺"}</span>
                    )}
                    {option.label}
                    <span className="muted" style={{ display: "block", fontWeight: 600, marginTop: 6 }}>
                      {option.caption}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10 }}>
              <HintButton hintKey={`hint:${key}`} text={item.hint} disabled={solved} />
            </div>
            {solved ? <div className="fb ok">✓ {item.why}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function RiddleStepView({ step }: { step: RiddleStep }) {
  const { progress, patch, award, lesson, speak } = useLesson();
  return (
    <div>
      <div className="instructions">
        <span className="emoji">❓</span>
        <span>{step.instructions}</span>
      </div>
      {step.items.map((item, index) => {
        const key = `${step.id}:${index}`;
        const solved = Boolean(progress.solved[key]);
        const wrong = progress.wrong[key] ?? [];
        return (
          <div key={item.reveal} className="card">
            {item.clues.map((clue) => (
              <div key={clue} className="riddle-clue">
                <ClickableText text={clue} />
              </div>
            ))}
            <div className="opts">
              {item.options.map((option, optionIndex) => {
                const right = solved && optionIndex === item.answer;
                const bad = wrong.includes(optionIndex);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`opt${right ? " right" : ""}${bad ? " wrong" : ""}`}
                    disabled={solved || bad}
                    onClick={(event) => {
                      if (optionIndex === item.answer) {
                        const points = pointsForAttempt(lesson.scoring, {
                          wrongBefore: wrong.length > 0,
                          hintUsed: Boolean(progress.hints[`hint:${key}`]),
                        });
                        patch((current) => ({ ...current, solved: { ...current.solved, [key]: true } }));
                        award(`riddle:${step.id}:${index}`, points, event.currentTarget);
                        void speak(item.reveal);
                      } else if (!wrong.includes(optionIndex)) {
                        patch((current) => ({
                          ...current,
                          wrong: { ...current.wrong, [key]: [...wrong, optionIndex] },
                        }));
                      }
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <HintButton hintKey={`hint:${key}`} text={item.hint} disabled={solved} />
            </div>
            {solved ? <div className="fb ok">✓ {item.reveal}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function WritingStepView({ step }: { step: WritingStep }) {
  const { progress, patch, award, lesson } = useLesson();
  const saved = progress.writing[step.id] ?? { text: "", awarded: {}, tries: 0 };
  const [showModel, setShowModel] = useState(false);
  const hintKey = `hint:${step.id}`;

  function check(anchor: HTMLElement) {
    const text = saved.text.toLowerCase();
    const awarded = { ...saved.awarded };
    const fresh: string[] = [];
    for (const item of step.checklist) {
      if (awarded[item.id]) continue;
      if (item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
        fresh.push(item.id);
        awarded[item.id] = 1;
      }
    }
    patch((current) => ({
      ...current,
      writing: {
        ...current.writing,
        [step.id]: { text: saved.text, awarded, tries: saved.tries + 1 },
      },
    }));
    const points = pointsForAttempt(lesson.scoring, {
      wrongBefore: saved.tries > 0,
      hintUsed: Boolean(progress.hints[hintKey]),
    });
    for (const id of fresh) award(`write:${step.id}:${id}`, points, anchor);
    setShowModel(true);
  }

  const hit = step.checklist.filter((item) => saved.awarded[item.id]).length;

  return (
    <div>
      <div className="instructions">
        <span className="emoji">✍️</span>
        <span>{step.instructions}</span>
      </div>
      <div className="card">
        <h2>
          <ClickableText text={step.prompt} sentence={step.model} />
        </h2>
        <ul>
          {step.bullets.map((bullet) => (
            <li key={bullet}>
              <ClickableText text={bullet} />
            </li>
          ))}
        </ul>
        <textarea
          className="write-box"
          value={saved.text}
          aria-label="Your German text"
          onChange={(event) =>
            patch((current) => ({
              ...current,
              writing: {
                ...current.writing,
                [step.id]: { ...saved, text: event.target.value },
              },
            }))
          }
        />
        <div className="bactions">
          <button className="btn btn-primary" type="button" onClick={(event) => check(event.currentTarget)}>
            Check checklist
          </button>
          <HintButton hintKey={hintKey} text={step.hint} />
          <span className="muted">
            {hit}/{step.checklist.length} points
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          {step.checklist.map((item) => (
            <div key={item.id} className="check-item">
              <span>{saved.awarded[item.id] ? "✅" : "⬜"}</span>
              <span>
                <ClickableText text={item.label} />
              </span>
            </div>
          ))}
        </div>
        {showModel || hit > 0 ? (
          <div className="model">
            <b>Model answer</b>
            <p style={{ margin: "6px 0 0" }}>
              <ClickableText text={step.model} sentence={step.model} />
            </p>
            {step.modelEn ? <p className="muted">{step.modelEn}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { SummaryStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { lernkontrolleStep, MASTERY_RATIO, solvedQuizCount } from "@/lib/practice";

const DEFAULT_MESSAGES = [
  "Keep practising, you'll get there! 💪",
  "Good start! Review the grammar and try again.",
  "Sehr gut! Great work on the ward.",
  "Ausgezeichnet! You're ready for the ward round. 🩺",
];

export function SummaryStepView({
  step,
  onRestart,
  onReview,
}: {
  step: SummaryStep;
  onRestart: () => void;
  onReview: () => void;
}) {
  const { lesson, progress, total, max, stars, sections, sectionScore, speak } = useLesson();
  const test = lernkontrolleStep(lesson);
  const testSolved = test ? solvedQuizCount(progress.mc, test.id, test.quiz.length) : 0;
  const testPct = test && test.quiz.length ? Math.round((testSolved / test.quiz.length) * 100) : 0;
  const mastered = Boolean(progress.completedAt) || Boolean(test && testSolved / test.quiz.length >= MASTERY_RATIO);
  const ratio = max ? total / max : 0;
  const messages = step.messages ?? DEFAULT_MESSAGES;
  const [widths, setWidths] = useState(false);
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const id = window.setTimeout(() => setWidths(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div>
      <div className="sum-hero">
        <div className="kicker" style={{ color: "#99f6e4" }}>
          {lesson.platform} · {lesson.level} · {lesson.title}
        </div>
        <h2>{step.title}</h2>
        <div className="big-stars emoji">
          {[0, 1, 2].map((index) => (
            <span key={index} className={index < stars ? "" : "off"} style={{ animationDelay: `${200 + index * 220}ms` }}>
              ⭐
            </span>
          ))}
        </div>
        <div className="score-big">
          {total} / {max} points · {Math.round(ratio * 100)}%
        </div>
        <div style={{ marginTop: 6, opacity: 0.95 }}>{messages[stars]}</div>
        {test ? (
          <p data-testid="summary-mastery" style={{ marginTop: 8 }}>
            {mastered ? "Mastered" : "Not mastered yet"} · Lernkontrolle {testPct}%
          </p>
        ) : null}
        {stars >= 2 && !reduce
          ? Array.from({ length: 28 }, (_, index) => (
              <i
                key={index}
                className="confetti"
                style={{
                  left: `${(index * 37) % 100}%`,
                  background: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#fff"][index % 5],
                  animationDuration: `${1.6 + (index % 5) * 0.25}s`,
                  animationDelay: `${(index % 7) * 0.08}s`,
                }}
              />
            ))
          : null}
      </div>
      <div className="grid2">
        <div className="card">
          <h2>📊 Your results</h2>
          <div className="breakdown">
            {sections.map((section) => {
              const points = sectionScore(section.key);
              return (
                <div key={section.key} className="bd-row">
                  <span>{section.label}</span>
                  <span className="bar">
                    <i style={{ width: widths ? `${section.max ? (points / section.max) * 100 : 0}%` : 0 }} />
                  </span>
                  <span className="v">
                    {points}/{section.max}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="button" onClick={onRestart}>
              ↺ Try the lesson again
            </button>
            <button className="btn btn-ghost" type="button" onClick={onReview}>
              📖 Review grammar
            </button>
          </div>
        </div>
        <div className="card">
          {step.rules?.length ? (
            <>
              <h2>Case rules to keep</h2>
              <div className="rules">
                {step.rules.map((rule, index) => (
                  <div key={`${rule.c}-${index}`} className={`rule c-${rule.c}`}>
                    <span className="cbadge">{lesson.cases?.[rule.c].name ?? rule.c}</span>
                    <span>{rule.rule}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <h2 style={{ marginTop: step.rules?.length ? 18 : 0 }}>🗣️ Redemittel: key phrases for the ward</h2>
          <div className="redemittel">
            {step.redemittel.map((line, index) => (
              <div key={`${index}-${line.de}`} className="rm">
                <button className="icon-btn" type="button" title="Listen" onClick={() => void speak(line.de)}>
                  🔊
                </button>
                <div>
                  <b>{line.de}</b>
                  <span>{line.en}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

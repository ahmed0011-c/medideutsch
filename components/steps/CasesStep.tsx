"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CasesStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { CaseMarks, McBlock, RichText } from "@/components/lesson/bits";
import { Illustration } from "@/components/illustrations";
import { stripCaseMarks } from "@/lib/tokens";

const ORDER = ["N", "A", "D", "G"] as const;

/** Reference page: the same article table and role cards as the cases lesson, without scoring. */
export function CaseReference() {
  const { lesson } = useLesson();
  const step = lesson.steps.find((item) => item.type === "cases");
  if (!step || step.type !== "cases" || !lesson.cases) return null;
  return (
    <div>
      <div className="card">
        <div className="scene-grid">
          <Illustration id="ward" />
          <div>
            <h2>Every noun has a job</h2>
            <p style={{ marginTop: 0 }}>
              <RichText html={step.intro} />
            </p>
            <div className="qwords">
              {ORDER.map((id) => (
                <div key={id} className={`qw c-${id}`}>
                  <b>{lesson.cases![id].q}</b>
                  <span>{lesson.cases![id].name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>The four roles on the ward</h2>
        <div className="roles">
          {step.roles.map((role) => (
            <RoleCard key={role.c} role={role} />
          ))}
        </div>
      </div>
      <ArticleTable table={step.table} />
    </div>
  );
}

function RoleCard({ role }: { role: CasesStep["roles"][number] }) {
  const { lesson, speak } = useLesson();
  const cases = lesson.cases!;
  return (
    <div className={`role c-${role.c}`}>
      <div className="rh">
        <span className="emoji">{cases[role.c].emoji}</span>
        {cases[role.c].name}
        <span className="rq">{role.q}</span>
      </div>
      <div className="r-title">{role.title}</div>
      <div className="r-meta">{role.metaphor}</div>
      <div className="rex">
        <button className="say" type="button" title="Listen" onClick={() => void speak(stripCaseMarks(role.de))}>
          🔊
        </button>
        <span>
          <CaseMarks text={role.de} />
        </span>
      </div>
      <div className="exen">{role.en}</div>
    </div>
  );
}

export function CasesStepView({ step }: { step: CasesStep }) {
  const { lesson, speak } = useLesson();
  const cases = lesson.cases;
  if (!cases) return null;
  return (
    <div>
      <div className="card">
        <div className="scene-grid">
          <Illustration id="ward" />
          <div>
            <h2>Every noun has a job</h2>
            <p style={{ marginTop: 0 }}>
              <RichText html={step.intro} />
            </p>
            <div className="qwords">
              {ORDER.map((id) => (
                <div key={id} className={`qw c-${id}`}>
                  <b>{cases[id].q}</b>
                  <span>{cases[id].name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>The four roles on the ward</h2>
        <div className="roles">
          {step.roles.map((role) => (
            <div key={role.c} className={`role c-${role.c}`}>
              <div className="rh">
                <span className="emoji">{cases[role.c].emoji}</span>
                {cases[role.c].name}
                <span className="rq">{role.q}</span>
              </div>
              <div className="r-title">{role.title}</div>
              <div className="r-meta">{role.metaphor}</div>
              <div className="rex">
                <button
                  className="say"
                  type="button"
                  title="Listen"
                  onClick={() => void speak(stripCaseMarks(role.de))}
                >
                  🔊
                </button>
                <span>
                  <CaseMarks text={role.de} />
                </span>
              </div>
              <div className="exen">{role.en}</div>
            </div>
          ))}
        </div>
      </div>
      <CaseAnimation step={step} />
      <ArticleTable table={step.table} />
      <div className="card">
        <h2>Quick check</h2>
        {step.quiz.map((question, index) => (
          <McBlock key={question.q} question={question} itemKey={`gq:${step.id}:${index}`} />
        ))}
      </div>
    </div>
  );
}

export function ArticleTable({ table }: { table: CasesStep["table"] }) {
  const { lesson, speak } = useLesson();
  const cases = lesson.cases;
  const [set, setSet] = useState<"definite" | "indefinite">("definite");
  if (!cases) return null;
  const data = table[set];
  const nomNouns = data.N.map((cell) => cell.split("|")[1]);
  const dots = ["var(--der)", "var(--die)", "var(--das)", "#64748b"];
  return (
    <div className="card">
      <h2>The article table</h2>
      <div className="conj-tabs">
        <button
          className={`btn ${set === "definite" ? "btn-primary" : "btn-ghost"}`}
          type="button"
          onClick={() => setSet("definite")}
        >
          der · die · das
        </button>
        <button
          className={`btn ${set === "indefinite" ? "btn-primary" : "btn-ghost"}`}
          type="button"
          onClick={() => setSet("indefinite")}
        >
          ein · eine
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="art conj-fade">
          <thead>
            <tr>
              <th>Case</th>
              {table.genders.map((gender, index) => (
                <th key={gender}>
                  <i style={{ background: dots[index] }} />
                  {gender}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORDER.map((id) => (
              <tr key={id} className={`c-${id}`}>
                <td className="rl">
                  {cases[id].name}
                  <small>{cases[id].q}</small>
                </td>
                {data[id].map((cell, index) => {
                  const [rawArticle, noun] = cell.split("|");
                  const changed = rawArticle.endsWith("*");
                  const article = rawArticle.replace("*", "");
                  const base = nomNouns[index];
                  const ending =
                    noun !== base && noun.startsWith(base) ? noun.slice(base.length) : "";
                  const spoken = `${article === "–" ? "" : article.replace(/[()]/g, "") + " "}${noun}`.trim();
                  return (
                    <td key={noun + index} onClick={() => void speak(spoken)} style={{ cursor: "pointer" }}>
                      <span className={`ta${changed ? " chg" : ""}`}>{article}</span>{" "}
                      <span className="tn">
                        {ending ? (
                          <>
                            {base}
                            <b>{ending}</b>
                          </>
                        ) : (
                          noun
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13.5, margin: "8px 0 0" }}>
        {table.note} Akkusativ is rose, not blue, so it stays distinct from the masculine article <b className="art-der">der</b>.
      </p>
    </div>
  );
}

function CaseAnimation({ step }: { step: CasesStep }) {
  const { lesson, progress, patch, speak } = useLesson();
  const cases = lesson.cases!;
  const reduce = useReducedMotion();
  const index = progress.anim[step.id] ?? 0;
  const example = step.animation[index % step.animation.length];
  const revealed = progress.lines[`${step.id}:reveal`]?.length
    ? progress.lines[`${step.id}:reveal`]
    : [];
  // reuse lines array as the revealed role indexes for this animation example
  const shown = revealed;

  function revealNext() {
    if (shown.length >= example.order.length) {
      patch((current) => ({
        ...current,
        lines: { ...current.lines, [`${step.id}:reveal`]: [] },
      }));
      return;
    }
    const next = example.order[shown.length];
    patch((current) => ({
      ...current,
      lines: { ...current.lines, [`${step.id}:reveal`]: [...shown, next] },
    }));
  }

  const active = shown.length ? example.parts[shown[shown.length - 1]] : null;
  const full = example.parts.map((part) => part.t).join(" ") + example.punct;

  return (
    <div className="card">
      <h2>Who does what to whom?</h2>
      <div className="case-stage">
        <div className="case-sent">
          {example.parts.map((part, i) => {
            const on = shown.includes(i);
            return (
              <motion.span
                key={`${index}-${part.t}`}
                className={`cpart${part.c ? ` np c-${part.c}` : ""}${on ? " on" : ""}`}
                animate={on && !reduce ? { y: -4 } : { y: 0 }}
              >
                {part.t}
                {i === example.parts.length - 1 ? example.punct : ""}
                {part.c ? <span className="lab">{cases[part.c].name}</span> : null}
              </motion.span>
            );
          })}
        </div>
        <div className="case-q">
          {active?.c && active.q ? (
            <span className={`bub c-${active.c}`}>
              {active.q} → <b>{active.t}</b> = {cases[active.c].name}
            </span>
          ) : (
            <span className="muted">
              Press <b>Next role</b> and ask the case question for each phrase.
            </span>
          )}
        </div>
        <div className="sent-en">{example.en}</div>
      </div>
      <div className="anim-controls">
        <button className="btn btn-primary" type="button" onClick={revealNext}>
          {shown.length >= example.order.length ? "↺ Replay" : "Next role ▶"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() =>
            patch((current) => ({
              ...current,
              anim: { ...current.anim, [step.id]: index + 1 },
              lines: { ...current.lines, [`${step.id}:reveal`]: [] },
            }))
          }
        >
          Next example ↻
        </button>
        <button className="btn btn-soft" type="button" onClick={() => void speak(full)}>
          🔊 Listen
        </button>
      </div>
    </div>
  );
}

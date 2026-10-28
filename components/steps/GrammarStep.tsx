"use client";

import { useMemo, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import type { GrammarStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { ClickableText, McBlock, RichText } from "@/components/lesson/bits";
import { Illustration } from "@/components/illustrations";
import { MASTERY_RATIO, solvedQuizCount } from "@/lib/practice";

type Token = { id: string; text: string; role: string; label: string };

function articleMark(text: string) {
  const kind = text.trim().toLowerCase();
  if (kind === "der" || kind === "die" || kind === "das") {
    return <b className={`art-${kind}`}>{text}</b>;
  }
  return text;
}

function tokensOf(stepIndex: number, example: NonNullable<GrammarStep["animation"]>[number], phase: "before" | "after"): Token[] {
  if (phase === "before") {
    return example.before.map((token, i) => ({
      id: `${stepIndex}-${token.t}-${i}`,
      text: token.t,
      role: token.r,
      label: token.r === "subj" ? "Pos 1" : token.r === "verb" ? "Pos 2 · verb" : "…",
    }));
  }
  if (example.after) {
    return example.after.map((token, i) => ({
      id: `${stepIndex}-after-${token.t}-${i}`,
      text: token.t,
      role: token.r,
      label: token.r,
    }));
  }
  const verb = example.before.find((token) => token.r === "verb");
  const rest = example.before.filter((token) => token.r === "rest");
  const subj = example.before.find((token) => token.r === "subj");
  const out: Token[] = [];
  if (subj) out.push({ id: `${stepIndex}-${subj.t}-subj`, text: subj.t, role: "subj", label: "Pos 1" });
  if (example.modal) {
    out.push({ id: `${stepIndex}-modal`, text: example.modal, role: "modal", label: "Pos 2 · modal" });
  }
  rest.forEach((token, i) => out.push({ id: `${stepIndex}-rest-${i}`, text: token.t, role: "rest", label: "middle" }));
  if (verb) {
    out.push({
      id: `${stepIndex}-inf`,
      text: verb.inf ?? verb.t,
      role: "inf",
      label: "END · infinitive",
    });
  }
  return out;
}

export function GrammarStepView({ step }: { step: GrammarStep }) {
  const { lesson, progress, patch, speak } = useLesson();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [conjSet, setConjSet] = useState<"main" | "extra">("main");
  const animIndex = progress.anim[step.id] ?? 0;
  const example = step.animation?.[animIndex % step.animation.length];
  const tokens = useMemo(
    () => (example ? tokensOf(animIndex, example, phase) : []),
    [example, animIndex, phase],
  );

  const spoken =
    example && phase === "after"
      ? `${tokens.map((token) => token.text).join(" ")}.`
      : example
        ? `${example.before.map((token) => token.t).join(" ")}.`
        : "";

  return (
    <div>
      <div className="card">
        <div className="oa-hero">
          <Illustration id={step.heroImage ?? "oberarzt"} />
          <div>
            <h2>{step.heroTitle ?? "The grammar on this ward"}</h2>
            {step.story.map((paragraph) => (
              <p key={paragraph}>
                <RichText html={paragraph} />
              </p>
            ))}
            {example?.modal ? (
              <div className="queue">
                <div className="slot">Pos 1<br />subject / time</div>
                <div className="slot s2">Pos 2<br />modal verb</div>
                <div className="slot">… middle …</div>
                <div className="slot end">END<br />infinitive</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {example ? (
        <div className="card">
          <h2>🎬 Watch the pattern</h2>
          <div className="bracket-stage">
            <LayoutGroup>
              <div className="sentence" style={{ position: "relative" }}>
                {tokens.map((token) => (
                  <motion.div
                    layout
                    key={token.id}
                    className={`tok ${token.role}`}
                    transition={{ duration: reduce ? 0 : 0.55 }}
                  >
                    <div className="chip">{token.text}</div>
                    <div className="pos-l">{token.label}</div>
                  </motion.div>
                ))}
                {phase === "after" && example.modal ? (
                  <motion.div
                    className="bracket on"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    style={{
                      position: "absolute",
                      left: "18%",
                      right: "8%",
                      bottom: 4,
                    }}
                  >
                    <span>{example.bracketLabel ?? "Satzklammer · sentence bracket"}</span>
                  </motion.div>
                ) : null}
              </div>
            </LayoutGroup>
            <div className="sent-en">{phase === "before" ? example.enBefore : example.enAfter}</div>
          </div>
          <div className="anim-controls">
            <button
              className="btn btn-primary"
              type="button"
              disabled={phase === "after"}
              onClick={() => {
                setPhase("after");
                void speak(
                  `${tokensOf(animIndex, example, "after").map((token) => token.text).join(" ")}.`,
                );
              }}
            >
              {example.callLabel ?? "Call the Oberarzt"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setPhase("before");
                patch((current) => ({
                  ...current,
                  anim: { ...current.anim, [step.id]: animIndex + 1 },
                }));
              }}
            >
              Next example ↻
            </button>
            <button className="btn btn-soft" type="button" onClick={() => void speak(spoken)}>
              🔊 Listen
            </button>
          </div>
          {step.questionRule ? (
            <div className="qrule">
              <RichText html={step.questionRule} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step.tables?.map((table) => (
        <div className="card" key={table.title}>
          <h2>{table.title}</h2>
          {table.caption ? <p className="muted">{table.caption}</p> : null}
          <table className="conj">
            <thead>
              <tr>
                <th />
                {table.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.label} className={row.highlight ? "same" : ""}>
                  <td className="p">{row.label}</td>
                  {row.cells.map((cell, index) => (
                    <td key={index}>{articleMark(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {step.meanings ? (
        <div className="card">
          <h2>{step.meaningsTitle ?? "Six modal verbs, six jobs"}</h2>
          <div className="meanings">
            {step.meanings.map((meaning) => (
              <div className="mcard" key={meaning.modal}>
                <div className="top">
                  <span className="em emoji">{meaning.emoji}</span>
                  <span className="mv">{meaning.modal}</span>
                </div>
                <div className="men">{meaning.en}</div>
                <div className="use">{meaning.use}</div>
                <div className="ex">
                  <button className="say" type="button" title="Listen" onClick={() => void speak(meaning.de)}>
                    🔊
                  </button>
                  <span>
                    <ClickableText text={meaning.de} sentence={meaning.de} />
                  </span>
                </div>
                <div className="exen">{meaning.deEn}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {step.warning ? (
        <div className="card warnbox">
          <h3>⚠️ {step.warning.title}</h3>
          <div className="vs">
            {step.warning.items.map((item) => (
              <div key={item.de} className={`it ${item.tone}`}>
                <b>
                  {item.tone === "ok" ? "🟢" : "⛔"} <ClickableText text={item.de} sentence={item.de} />
                </b>
                {item.en}
              </div>
            ))}
          </div>
          <div>
            <RichText html={step.warning.tip} />
          </div>
        </div>
      ) : null}

      {step.conjugation ? (
        <div className="card">
          <h2>Conjugation</h2>
          <div className="conj-tabs">
            <button
              className={`btn ${conjSet === "main" ? "btn-primary" : "btn-ghost"}`}
              type="button"
              onClick={() => setConjSet("main")}
            >
              {step.conjugation.main.join(" · ")}
            </button>
            {step.conjugation.extra ? (
              <button
                className={`btn ${conjSet === "extra" ? "btn-primary" : "btn-ghost"}`}
                type="button"
                onClick={() => setConjSet("extra")}
              >
                {step.conjugation.extra.join(" · ")}
              </button>
            ) : null}
          </div>
          <ConjugationTable
            persons={step.conjugation.persons}
            verbs={conjSet === "extra" && step.conjugation.extra ? step.conjugation.extra : step.conjugation.main}
            forms={step.conjugation.forms}
            onSpeak={(text) => void speak(text)}
          />
          <div className="legend">
            <span><i style={{ background: "#c2410c" }} /> singular stem</span>
            <span><i style={{ background: "#0d9488" }} /> plural stem</span>
            <span><i style={{ background: "#7c3aed" }} /> ending</span>
            <span><i style={{ background: "#fff3d6", border: "1px solid #f59e0b" }} /> ich = er/sie/es</span>
          </div>
          <ul className="tips">
            {step.conjugation.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step.tips?.length ? (
        <div className="card">
          <h2>Clever tips</h2>
          {step.tips.map((tip) => (
            <div key={tip.title} className="note" style={{ marginBottom: 8 }}>
              <b>{tip.title}. </b>
              {tip.body ?? tip.rule}
              {tip.mnemonic ? <div>{tip.mnemonic}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {step.quiz.length ? (
        <div className="card">
          <h2>{step.quizTitle ?? "Quick check"}</h2>
          {step.practice === "lernkontrolle" ? (
            <LernkontrolleBanner stepId={step.id} total={step.quiz.length} />
          ) : null}
          {step.quiz.map((question, index) => (
            <McBlock key={question.q} question={question} itemKey={`gq:${step.id}:${index}`} />
          ))}
        </div>
      ) : null}
      <span className="sr-only">{lesson.title}</span>
    </div>
  );
}

function LernkontrolleBanner({ stepId, total }: { stepId: string; total: number }) {
  const { progress } = useLesson();
  const solved = solvedQuizCount(progress.mc, stepId, total);
  const pct = Math.round((total ? solved / total : 0) * 100);
  const mastered = total > 0 && solved / total >= MASTERY_RATIO;
  return (
    <p className={`lk-result${mastered ? "" : " pending"}`} data-testid="lernkontrolle-result">
      Lernkontrolle: {solved} / {total} · {pct}%.{" "}
      {mastered ? "Lektion gemeistert — 80% erreicht." : "Noch nicht gemeistert. 80% sind nötig."}
    </p>
  );
}

function ConjugationTable({
  persons,
  verbs,
  forms,
  onSpeak,
}: {
  persons: string[];
  verbs: string[];
  forms: Record<string, string[]>;
  onSpeak: (text: string) => void;
}) {
  return (
    <table className="conj conj-fade">
      <thead>
        <tr>
          <th />
          {verbs.map((verb) => (
            <th key={verb}>{verb}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {persons.map((person, row) => (
          <tr key={person} className={row === 0 || row === 2 ? "same" : ""}>
            <td className="p">{person}</td>
            {verbs.map((verb) => {
              const raw = forms[verb]?.[row] ?? "";
              const [stem, ending] = raw.split("|");
              const spoken = `${person.split("/")[0]} ${stem}${ending ?? ""}`;
              return (
                <td key={verb} style={{ cursor: "pointer" }} onClick={() => onSpeak(spoken)}>
                  <span className={row < 3 ? "stem-sg" : "stem-pl"}>{stem}</span>
                  {ending ? <span className="end">{ending}</span> : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

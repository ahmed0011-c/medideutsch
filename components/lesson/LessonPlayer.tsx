"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Lesson, Step } from "@/lib/lesson-schema";
import { LessonProvider, useLesson } from "@/lib/lesson-context";
import { WordPopover } from "@/components/lesson/bits";
import { BrandMark } from "@/components/illustrations";
import { OverviewStepView } from "@/components/steps/OverviewStep";
import { DialogueStepView } from "@/components/steps/DialogueStep";
import { GrammarStepView } from "@/components/steps/GrammarStep";
import { CasesStepView } from "@/components/steps/CasesStep";
import { TipsStepView } from "@/components/steps/TipsStep";
import { GapCaseStepView, GapFillStepView } from "@/components/steps/GapSteps";
import { BuilderStepView } from "@/components/steps/BuilderStep";
import { PictureStepView } from "@/components/steps/PictureStep";
import { ColourStepView } from "@/components/steps/ColourStep";
import { ReadingStepView } from "@/components/steps/ReadingStep";
import { CompareStepView, RiddleStepView, WritingStepView } from "@/components/steps/ExtraSteps";
import { SummaryStepView } from "@/components/steps/SummaryStep";
import type { SavedProgress } from "@/lib/storage";

export function LessonPlayer({ lesson, initialStep = null }: { lesson: Lesson; initialStep?: number | null }) {
  return (
    <LessonProvider lesson={lesson} initialStep={initialStep}>
      <Shell />
    </LessonProvider>
  );
}

function Shell() {
  const { lesson, progress, patch, total, max, stars, ready, closePop, cancelSpeech, reset } = useLesson();
  const reduce = useReducedMotion();
  const index = Math.max(0, Math.min(lesson.steps.length - 1, progress.stepIndex || 0));
  const step = lesson.steps[index];

  useEffect(() => {
    if (!ready) return;
    const url = `${window.location.pathname}?step=${index}`;
    window.history.replaceState(null, "", url);
  }, [ready, index]);

  const stepRef = useRef(index);
  useEffect(() => {
    if (stepRef.current === index) return;
    stepRef.current = index;
    closePop();
    cancelSpeech();
  }, [index, closePop, cancelSpeech]);

  function go(next: number) {
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, next));
    patch((current) => ({ ...current, stepIndex: clamped }));
  }

  function restart() {
    reset();
  }

  if (!ready || !step) {
    return (
      <main>
        <p className="muted">Opening the lesson…</p>
      </main>
    );
  }

  const last = index === lesson.steps.length - 1;
  const reviewAt = lesson.steps.findIndex((item) =>
    step.type === "summary" && "reviewStepType" in step && step.reviewStepType
      ? item.type === step.reviewStepType
      : item.type === "grammar" || item.type === "cases",
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/learn" aria-label="Back to the course map">
            <BrandMark />
          </Link>
          <div className="lesson-pill">
            <span className="lvl">
              {lesson.level} · {lesson.unit} · Grammar
            </span>
            <span className="ttl">{lesson.title}</span>
          </div>
          <div className={`score-pill${total ? " bump" : ""}`}>
            <span className="pts">
              {total} / {max}
            </span>
            <span className="mini-stars" aria-label={`${stars} stars`}>
              {[0, 1, 2].map((star) => (
                <span key={star} className={star < stars ? "" : "off"}>
                  ⭐
                </span>
              ))}
            </span>
          </div>
        </div>
      </header>
      <div className="progress-wrap">
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${((index + 1) / lesson.steps.length) * 100}%` }} />
        </div>
        <div className="steps" role="tablist" aria-label="Lesson steps">
          {lesson.steps.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              className={`step-dot${itemIndex === index ? " active" : ""}${itemIndex < index ? " done" : ""}`}
              onClick={() => go(itemIndex)}
              aria-current={itemIndex === index ? "step" : undefined}
            >
              <span className="n">{itemIndex < index ? "✓" : itemIndex + 1}</span>
              <span className="l">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <main>
        <div className="step-head">
          <div>
            <div className="kicker">
              Step {index + 1} of {lesson.steps.length}
            </div>
            {step.type === "summary" ? null : <h1>{step.title}</h1>}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="step-view"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <StepBody
              step={step}
              onRestart={restart}
              onReview={() => go(reviewAt >= 0 ? reviewAt : 0)}
            />
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer-nav">
        <div className="footer-inner">
          <button className="btn btn-ghost" type="button" disabled={index === 0} onClick={() => go(index - 1)}>
            ← Back
          </button>
          <div className="status">{statusLine(step, progress, lesson)}</div>
          {last ? (
            <button className="btn btn-primary" type="button" onClick={restart}>
              Start over
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={() => go(index + 1)}>
              {index === lesson.steps.length - 2 ? "Finish" : "Next"} →
            </button>
          )}
        </div>
      </footer>
      <WordPopover />
    </>
  );
}

function StepBody({
  step,
  onRestart,
  onReview,
}: {
  step: Step;
  onRestart: () => void;
  onReview: () => void;
}) {
  switch (step.type) {
    case "overview":
      return <OverviewStepView step={step} />;
    case "dialogue":
      return <DialogueStepView step={step} />;
    case "grammar":
      return <GrammarStepView step={step} />;
    case "cases":
      return <CasesStepView step={step} />;
    case "tips":
      return <TipsStepView step={step} />;
    case "gapfill":
      return <GapFillStepView step={step} />;
    case "gapcase":
      return <GapCaseStepView step={step} />;
    case "builder":
      return <BuilderStepView step={step} />;
    case "picturematch":
      return <PictureStepView step={step} />;
    case "colour":
      return <ColourStepView step={step} />;
    case "reading":
      return <ReadingStepView step={step} />;
    case "compare":
      return <CompareStepView step={step} />;
    case "riddle":
      return <RiddleStepView step={step} />;
    case "writing":
      return <WritingStepView step={step} />;
    case "summary":
      return <SummaryStepView step={step} onRestart={onRestart} onReview={onReview} />;
    default:
      return null;
  }
}

function statusLine(step: Step, progress: SavedProgress, lesson: Lesson): string {
  switch (step.type) {
    case "overview":
    case "dialogue": {
      const n = Object.keys(progress.pts).filter((key) => key.startsWith("w:")).length;
      return `Explore words: ${Math.min(n, lesson.scoring.wordExplorePoints)}/${lesson.scoring.wordExplorePoints}`;
    }
    case "grammar":
    case "cases": {
      const n = step.quiz.filter((_, index) => progress.mc[`gq:${step.id}:${index}`]?.solved).length;
      return `Quick check: ${n}/${step.quiz.length}`;
    }
    case "tips": {
      const n = step.tips.filter((_, index) => progress.tips[`${step.id}:${index}`]).length;
      return `Tips collected: ${n}/${step.tips.length}`;
    }
    case "gapfill":
    case "gapcase": {
      const n = step.items.filter((_, index) => progress.gapDone[`${step.id}:${index}`]).length;
      return `Solved: ${n}/${step.items.length}`;
    }
    case "builder": {
      const n = step.items.filter((_, index) => progress.built[`${step.id}:${index}`]).length;
      return `Solved: ${n}/${step.items.length}`;
    }
    case "picturematch": {
      const n = step.items.filter((item) => progress.matched[`${step.id}:${item.id}`]).length;
      return `Matched: ${n}/${step.items.length}`;
    }
    case "colour": {
      const n = step.sentences.filter((_, index) => progress.coloured[`${step.id}:${index}`]).length;
      return `Coloured: ${n}/${step.sentences.length}`;
    }
    case "reading": {
      const n = step.questions.filter((_, index) => progress.mc[`r:${step.id}:${index}`]?.solved).length;
      return `Answered: ${n}/${step.questions.length}`;
    }
    case "compare":
    case "riddle": {
      const n = step.items.filter((_, index) => progress.solved[`${step.id}:${index}`]).length;
      return `Solved: ${n}/${step.items.length}`;
    }
    case "writing": {
      const got = Object.keys(progress.writing[step.id]?.awarded ?? {}).length;
      return `Checklist: ${got}/${step.checklist.length}`;
    }
    case "summary":
      return "Lesson complete";
    default:
      return "";
  }
}

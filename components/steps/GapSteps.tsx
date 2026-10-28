"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { GapCaseStep, GapFillStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { ClickableText, HintButton } from "@/components/lesson/bits";
import { useLessonSensors } from "@/components/lesson/dnd";
import { pointsForAttempt } from "@/lib/scoring";
import { seededShuffle } from "@/lib/shuffle";

export function GapFillStepView({ step }: { step: GapFillStep }) {
  const { progress, patch, award, lesson, speak, toast } = useLesson();
  const sensors = useLessonSensors();
  const [selected, setSelected] = useState<string | null>(null);
  const chips = seededShuffle(step.chips, 3);
  const used = new Set(
    step.items.filter((_, index) => progress.gapDone[`${step.id}:${index}`]).map((item) => item.answer),
  );

  function tryGap(index: number, word: string, anchor: HTMLElement | null) {
    const item = step.items[index];
    const key = `${step.id}:${index}`;
    if (progress.gapDone[key] || !item) return;
    if (word === item.answer) {
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: (progress.gapTries[key] ?? 0) > 0,
        hintUsed: Boolean(progress.hints[`hint:${key}`]),
      });
      patch((current) => ({ ...current, gapDone: { ...current.gapDone, [key]: true } }));
      award(`gapfill:${step.id}:${index}`, points, anchor);
      void speak(`${item.before ? item.before + " " : ""}${word} ${item.after}`);
      if (step.items.every((_, i) => i === index || progress.gapDone[`${step.id}:${i}`])) {
        toast("All gaps filled.");
      }
    } else {
      patch((current) => ({
        ...current,
        gapTries: { ...current.gapTries, [key]: (current.gapTries[key] ?? 0) + 1 },
        wrong: { ...current.wrong, [key]: [1] },
      }));
      const chip = step.chips.find((entry) => entry.w === word);
      toast(chip ? `${word}: ${chip.hint}` : "That verb does not fit.");
    }
    setSelected(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const word = String(event.active.id).replace(/^chip:/, "");
    const over = event.over?.id ? String(event.over.id) : "";
    if (over.startsWith("gap:")) {
      const index = Number(over.slice(4));
      const node = document.querySelector(`[data-gap="${index}"]`);
      tryGap(index, word, node as HTMLElement | null);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      <div className="instructions">
        <span className="emoji">✋</span>
        <span>{step.instructions}</span>
      </div>
      <div className="card">
        <div className="bank sticky">
          {chips.map((chip) =>
            used.has(chip.w) ? null : (
              <Chip key={chip.w} id={`chip:${chip.w}`} label={chip.w} selected={selected === chip.w} onTap={() => setSelected((cur) => (cur === chip.w ? null : chip.w))} />
            ),
          )}
        </div>
        <div className="gap-items">
          {step.items.map((item, index) => {
            const key = `${step.id}:${index}`;
            const done = Boolean(progress.gapDone[key]);
            const wrong = (progress.wrong[key]?.length ?? 0) > 0 && !done;
            return (
              <div key={key} className={`gitem${done ? " solved" : ""}`}>
                <div className="row">
                  <span className="num">{index + 1}</span>
                  {item.who ? <span className="who emoji">{item.who}</span> : null}
                  {item.before ? (
                    <ClickableText
                      text={item.before}
                      sentence={`${item.before} ${item.answer} ${item.after}`.replace(/\s+/g, " ").trim()}
                    />
                  ) : null}
                  <GapSlot
                    index={index}
                    filled={done}
                    wrong={wrong}
                    text={done ? item.answer : selected ? "…" : "?"}
                    onClick={(node) => {
                      if (selected) tryGap(index, selected, node);
                      else if (!done) toast("Pick a word first, then tap the gap.");
                    }}
                  />
                  {item.after ? (
                    <ClickableText
                      text={item.after}
                      sentence={`${item.before} ${item.answer} ${item.after}`.replace(/\s+/g, " ").trim()}
                    />
                  ) : null}
                  {item.hint ? <HintButton hintKey={`hint:${key}`} text={item.hint} disabled={done} /> : null}
                </div>
                {done ? (
                  <>
                    <div className="fb ok">✓ {item.why}</div>
                    <div className="en">{item.en}</div>
                  </>
                ) : wrong ? (
                  <div className="fb bad">✗ Not yet. {item.tip}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <DragOverlay>{null}</DragOverlay>
    </DndContext>
  );
}

export function GapCaseStepView({ step }: { step: GapCaseStep }) {
  const { progress, patch, award, lesson, speak, toast } = useLesson();
  const sensors = useLessonSensors();
  const [selected, setSelected] = useState<string | null>(null);

  function display(before: string, word: string) {
    return before ? word : word.charAt(0).toUpperCase() + word.slice(1);
  }

  function tryGap(index: number, word: string, anchor: HTMLElement | null) {
    const item = step.items[index];
    const key = `${step.id}:${index}`;
    if (!item || progress.gapDone[key]) return;
    if (word === item.answer) {
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: (progress.gapTries[key] ?? 0) > 0,
        hintUsed: Boolean(progress.hints[`hint:${key}`]),
      });
      patch((current) => ({ ...current, gapDone: { ...current.gapDone, [key]: true } }));
      award(`gapcase:${step.id}:${index}`, points, anchor);
      void speak(`${item.before ? item.before + " " : ""}${display(item.before, word)} ${item.after}`);
    } else {
      const typeMismatch = item.base.startsWith("ein") !== word.startsWith("ein");
      patch((current) => ({
        ...current,
        gapTries: { ...current.gapTries, [key]: (current.gapTries[key] ?? 0) + 1 },
        wrong: { ...current.wrong, [key]: [1] },
      }));
      toast(
        typeMismatch
          ? `Look at the bracket: you need a form of ${item.base.startsWith("ein") ? "ein/eine" : "der/die/das"}.`
          : step.chipInfo[word] ?? "That article does not fit.",
      );
    }
    setSelected(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const word = String(event.active.id).replace(/^art:/, "");
    const over = event.over?.id ? String(event.over.id) : "";
    if (over.startsWith("gap:")) {
      const index = Number(over.slice(4));
      tryGap(index, word, document.querySelector(`[data-gap="${step.id}-${index}"]`) as HTMLElement | null);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      <div className="instructions">
        <span className="emoji">✋</span>
        <span>{step.instructions}</span>
      </div>
      <div className="card">
        <div className="bank sticky articles">
          {step.chips.map((chip) => (
            <Chip
              key={chip}
              id={`art:${chip}`}
              label={chip}
              selected={selected === chip}
              onTap={() => setSelected((cur) => (cur === chip ? null : chip))}
            />
          ))}
        </div>
        <div className="gap-items">
          {step.items.map((item, index) => {
            const key = `${step.id}:${index}`;
            const done = Boolean(progress.gapDone[key]);
            const wrong = (progress.wrong[key]?.length ?? 0) > 0 && !done;
            return (
              <div key={key} className={`gitem${done ? " solved" : ""}`}>
                <div className="row">
                  <span className="num">{index + 1}</span>
                  {item.before ? <ClickableText text={item.before} /> : null}
                  <GapSlot
                    index={index}
                    gapId={`${step.id}-${index}`}
                    filled={done}
                    wrong={wrong}
                    base={item.base}
                    text={done ? display(item.before, item.answer) : "?"}
                    onClick={(node) => {
                      if (selected) tryGap(index, selected, node);
                      else if (!done) toast("Pick an article first, then tap the gap.");
                    }}
                  />
                  {item.after ? <ClickableText text={item.after} /> : null}
                  <HintButton hintKey={`hint:${key}`} text={item.hint} disabled={done} />
                </div>
                {done ? <div className="fb ok">✓ {item.why}</div> : null}
                {wrong && !done ? (
                  <div className="fb bad">✗ Not yet. Try again, or use the hint.</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

function Chip({
  id,
  label,
  selected,
  onTap,
}: {
  id: string;
  label: string;
  selected: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`dchip${selected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
      {...listeners}
      {...attributes}
      onClick={onTap}
    >
      {label}
    </button>
  );
}

function GapSlot({
  index,
  gapId,
  filled,
  wrong,
  text,
  base,
  onClick,
}: {
  index: number;
  gapId?: string;
  filled: boolean;
  wrong: boolean;
  text: string;
  base?: string;
  onClick: (node: HTMLElement) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `gap:${index}`, disabled: filled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-gap={gapId ?? String(index)}
      data-base={base}
      className={`gap${filled ? " filled" : ""}${wrong ? " wrong" : ""}${isOver ? " hover" : ""}`}
      onClick={(event) => onClick(event.currentTarget)}
    >
      {text}
    </button>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { PictureStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { HintButton } from "@/components/lesson/bits";
import { useLessonSensors } from "@/components/lesson/dnd";
import { Illustration } from "@/components/illustrations";
import { pointsForAttempt } from "@/lib/scoring";
import { seededShuffle } from "@/lib/shuffle";

export function PictureStepView({ step }: { step: PictureStep }) {
  const { progress, patch, award, lesson, speak, toast } = useLesson();
  const sensors = useLessonSensors();
  const [selected, setSelected] = useState<string | null>(null);
  const chips = seededShuffle(step.items, 11);
  const doneCount = step.items.filter((item) => progress.matched[`${step.id}:${item.id}`]).length;

  function tryMatch(id: string, target: string, anchor: HTMLElement | null) {
    const item = step.items.find((entry) => entry.id === id);
    if (!item || progress.matched[`${step.id}:${target}`]) return;
    if (id === target) {
      const key = `${step.id}:${id}`;
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: (progress.matchTries[key] ?? 0) > 0,
        hintUsed: Boolean(progress.hints[`hint:${key}`]),
      });
      patch((current) => ({ ...current, matched: { ...current.matched, [key]: true } }));
      award(`picturematch:${step.id}:${id}`, points, anchor);
      void speak(`${item.article} ${item.de}`);
      if (doneCount + 1 === step.items.length) toast("All items matched.");
    } else {
      const key = `${step.id}:${id}`;
      patch((current) => ({
        ...current,
        matchTries: { ...current.matchTries, [key]: (current.matchTries[key] ?? 0) + 1 },
        wrong: { ...current.wrong, [`pic:${target}`]: [1] },
      }));
      toast(`That's not ${item.article} ${item.de}. Try another picture.`);
      window.setTimeout(() => {
        patch((current) => ({ ...current, wrong: { ...current.wrong, [`pic:${target}`]: [] } }));
      }, 500);
    }
    setSelected(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id).replace(/^pic:/, "");
    const over = event.over ? String(event.over.id) : "";
    if (over.startsWith("slot:")) {
      const target = over.slice(5);
      const node = document.querySelector(`[data-pic="${target}"]`);
      tryMatch(id, target, node as HTMLElement | null);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      <div className="instructions">
        <span className="emoji">🖼️</span>
        <span>
          {step.instructions} <b className="art-der">der</b> · <b className="art-die">die</b> ·{" "}
          <b className="art-das">das</b>
        </span>
      </div>
      <div className="card">
        {doneCount === step.items.length ? null : (
          <div className="bank sticky">
            {chips.map((item) =>
              progress.matched[`${step.id}:${item.id}`] ? null : (
                <WordChip
                  key={item.id}
                  item={item}
                  selected={selected === item.id}
                  onTap={() => setSelected((current) => (current === item.id ? null : item.id))}
                />
              ),
            )}
          </div>
        )}
        <div className="pics">
          {step.items.map((item) => {
            const matched = Boolean(progress.matched[`${step.id}:${item.id}`]);
            const wrong = (progress.wrong[`pic:${item.id}`]?.length ?? 0) > 0 && !matched;
            return (
              <PictureCard
                key={item.id}
                item={item}
                matched={matched}
                wrong={wrong}
                armed={Boolean(selected) && !matched}
                onClick={(node) => {
                  if (selected) tryMatch(selected, item.id, node);
                  else if (!matched) toast("Pick a word first, then tap the picture.");
                }}
                onSpeak={() => void speak(`${item.article} ${item.de}`)}
              />
            );
          })}
        </div>
        {step.items.some((item) => item.hint) ? (
          <div style={{ marginTop: 12 }}>
            {step.items.map((item) =>
              item.hint && !progress.matched[`${step.id}:${item.id}`] ? (
                <div key={item.id} style={{ marginBottom: 8 }}>
                  <HintButton hintKey={`hint:${step.id}:${item.id}`} text={`${item.de}: ${item.hint}`} />
                </div>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </DndContext>
  );
}

function WordChip({
  item,
  selected,
  onTap,
}: {
  item: PictureStep["items"][number];
  selected: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pic:${item.id}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`dchip${selected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
      {...listeners}
      {...attributes}
      onClick={onTap}
    >
      <span className={`art-${item.article}`}>{item.article}</span> {item.de}
    </button>
  );
}

function PictureCard({
  item,
  matched,
  wrong,
  armed,
  onClick,
  onSpeak,
}: {
  item: PictureStep["items"][number];
  matched: boolean;
  wrong: boolean;
  armed: boolean;
  onClick: (node: HTMLElement) => void;
  onSpeak: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${item.id}`, disabled: matched });
  return (
    <div
      ref={setNodeRef}
      data-pic={item.id}
      className={`pic-card${matched ? " matched" : ""}${wrong ? " wrong" : ""}${armed || isOver ? " armed" : ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(".say")) return;
        onClick(event.currentTarget);
      }}
    >
      <div className="art-box">
        {item.image.type === "svg" ? <Illustration id={item.image.id} /> : null}
        {item.image.type === "url" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image.src} alt="" style={{ maxHeight: "88%" }} />
        ) : null}
      </div>
      <div className="slot">
        {matched ? (
          <>
            <b>
              <span className={`art-${item.article}`}>{item.article}</span> {item.de}{" "}
              <button className="say" type="button" title="Listen" onClick={onSpeak}>
                🔊
              </button>
            </b>
            <span>
              {item.en} · Pl.: {item.plural}
            </span>
          </>
        ) : (
          "Drop the word here"
        )}
      </div>
    </div>
  );
}

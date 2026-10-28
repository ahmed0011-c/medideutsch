"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { BuilderStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { ClickableText, HintButton } from "@/components/lesson/bits";
import { useLessonSensors } from "@/components/lesson/dnd";
import { builderAccepts, diagnoseBuilder, pointsForAttempt } from "@/lib/scoring";
import { shuffleNotIdentity } from "@/lib/shuffle";

export function BuilderStepView({ step }: { step: BuilderStep }) {
  return (
    <div>
      <div className="instructions">
        <span className="emoji">🧩</span>
        <span>{step.instructions}</span>
      </div>
      {step.items.map((item, index) => (
        <BuilderCard key={item.en} step={step} index={index} />
      ))}
    </div>
  );
}

function BuilderCard({ step, index }: { step: BuilderStep; index: number }) {
  const item = step.items[index];
  const { progress, patch, award, lesson, speak, toast } = useLesson();
  const sensors = useLessonSensors();
  const lineKey = `${step.id}:${index}`;
  const line = progress.lines[lineKey] ?? [];
  const solved = Boolean(progress.built[lineKey]);
  const [selected, setSelected] = useState<number | null>(null);
  const [bad, setBad] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const bankOrder = useMemo(
    () => shuffleNotIdentity(item.tiles.map((_, tile) => tile), index + 7),
    [item.tiles, index],
  );
  const bank = bankOrder.filter((tile) => !line.includes(tile));

  function setLine(next: number[]) {
    if (solved) return;
    patch((current) => ({ ...current, lines: { ...current.lines, [lineKey]: next } }));
    setBad(false);
    setMessage(null);
  }

  function place(tile: number) {
    if (line.includes(tile)) return;
    setLine([...line, tile]);
    setSelected(null);
  }

  function remove(tile: number) {
    setLine(line.filter((value) => value !== tile));
    setSelected(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const tile = Number(id.split(":").pop());
    const over = event.over ? String(event.over.id) : "";
    if (!over) return;
    if (over.startsWith("line:") || over.startsWith("placed:")) {
      if (over.startsWith("placed:")) {
        const before = Number(over.split(":").pop());
        const without = line.filter((value) => value !== tile);
        const at = without.indexOf(before);
        const next = at < 0 ? [...without, tile] : [...without.slice(0, at), tile, ...without.slice(at)];
        setLine(next);
      } else {
        place(tile);
      }
    } else if (over.startsWith("bank:") && line.includes(tile)) {
      remove(tile);
    }
  }

  function check(anchor: HTMLElement) {
    const words = line.map((tile) => item.tiles[tile]);
    if (builderAccepts(item, words)) {
      const points = pointsForAttempt(lesson.scoring, {
        wrongBefore: (progress.buildTries[lineKey] ?? 0) > 0,
        hintUsed: Boolean(progress.hints[`hint:${lineKey}`]),
      });
      patch((current) => ({ ...current, built: { ...current.built, [lineKey]: true } }));
      award(`builder:${step.id}:${index}`, points, anchor);
      void speak(`${words.join(" ")}${item.punct}`);
    } else {
      patch((current) => ({
        ...current,
        buildTries: { ...current.buildTries, [lineKey]: (current.buildTries[lineKey] ?? 0) + 1 },
      }));
      setBad(true);
      setMessage(diagnoseBuilder({ ...item, tiles: item.tiles }, words));
    }
  }

  const sentence = line.map((tile) => item.tiles[tile]).join(" ");

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      <div className="card bitem">
        <div className="head">
          <span className="num">{index + 1}</span>
          {item.task ? (
            <ClickableText text={item.task} sentence={item.answers[0]} />
          ) : (
            <span className="en">“{item.en}”</span>
          )}
        </div>
        <AnswerLine
          index={index}
          empty={!line.length}
          ok={solved}
          bad={bad}
          onPlace={() => {
            if (selected !== null) place(selected);
            else if (!solved) toast("Pick a tile, then tap the sentence line.");
          }}
        >
          {line.map((tile) => (
            <Tile
              key={tile}
              id={`placed:${index}:${tile}`}
              label={item.tiles[tile]}
              selected={selected === tile}
              disabled={solved}
              onTap={() => (solved ? undefined : remove(tile))}
            />
          ))}
          {line.length ? <span className="punct">{item.punct}</span> : null}
        </AnswerLine>
        {solved ? null : (
          <div className="bank">
            <Bank index={index} />
            {bank.map((tile) => (
              <Tile
                key={tile}
                id={`tile:${index}:${tile}`}
                label={item.tiles[tile]}
                selected={selected === tile}
                onTap={() => setSelected((current) => (current === tile ? null : tile))}
              />
            ))}
          </div>
        )}
        <div className="bactions">
          {solved ? (
            <button className="btn btn-soft" type="button" onClick={() => void speak(sentence + item.punct)}>
              🔊 Listen
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary"
                type="button"
                disabled={line.length !== item.tiles.length}
                onClick={(event) => check(event.currentTarget)}
              >
                Check
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setLine([])}>
                ↺ Reset
              </button>
              {item.hint ? <HintButton hintKey={`hint:${lineKey}`} text={item.hint} /> : null}
            </>
          )}
        </div>
        {solved ? (
          <div className="fb ok">
            ✓ Perfekt! „{sentence}
            {item.punct}“{item.task ? <div className="en">{item.en}</div> : null}
          </div>
        ) : message ? (
          <div className="fb bad">✗ Not yet. {message}</div>
        ) : null}
      </div>
      <DragOverlay />
    </DndContext>
  );
}

function Bank({ index }: { index: number }) {
  const { setNodeRef } = useDroppable({ id: `bank:${index}` });
  return <span ref={setNodeRef} />;
}

function AnswerLine({
  index,
  empty,
  ok,
  bad,
  onPlace,
  children,
}: {
  index: number;
  empty: boolean;
  ok: boolean;
  bad: boolean;
  onPlace: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `line:${index}` });
  return (
    <div
      ref={setNodeRef}
      className={`answer-line${empty ? " empty" : ""}${ok ? " ok" : ""}${bad ? " bad" : ""}${isOver ? " drop-hover" : ""}`}
      data-ph="Drop the words here …"
      onClick={onPlace}
      role="list"
    >
      {children}
    </div>
  );
}

function Tile({
  id,
  label,
  selected,
  disabled,
  onTap,
}: {
  id: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, disabled });
  return (
    <button
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      type="button"
      className={`dchip${selected ? " selected" : ""}${isDragging ? " dragging" : ""}${isOver ? " drop-hover" : ""}`}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        event.stopPropagation();
        onTap();
      }}
    >
      {label}
    </button>
  );
}

"use client";

import { useState } from "react";
import type { QuickReactStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { McBlock } from "@/components/lesson/bits";

export function QuickReactStepView({ step }: { step: QuickReactStep }) {
  const { progress } = useLesson();
  const key = (index: number) => `gq:${step.id}:${index}`;
  const [cursor, setCursor] = useState(() => {
    const open = step.items.findIndex((_, index) => !progress.mc[key(index)]?.solved);
    return open === -1 ? 0 : open;
  });
  const item = step.items[cursor];
  const solvedHere = Boolean(progress.mc[key(cursor)]?.solved);
  const solvedCount = step.items.filter((_, index) => progress.mc[key(index)]?.solved).length;

  return (
    <>
      <div className="instructions">
        <span className="emoji">{item.speaker ? "💬" : "⚡"}</span>
        <span>{step.instructions}</span>
      </div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          {cursor + 1} / {step.items.length}
          {solvedCount === step.items.length ? " · fertig" : ""}
        </p>
        {item.speaker && item.speakerLine ? (
          <div
            style={{
              background: "#e6f7f5",
              borderRadius: 16,
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <b>{item.speaker}</b>
            <p style={{ margin: "6px 0 0" }}>{item.speakerLine}</p>
          </div>
        ) : null}
        {step.cue && !item.speaker ? (
          <p style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: "var(--navy)" }}>{step.cue}</p>
        ) : null}
        <McBlock
          question={{
            q: item.prompt,
            qEn: item.qEn,
            options: item.options,
            answer: item.answer,
            why: item.why,
            hint: item.hint,
          }}
          itemKey={key(cursor)}
        />
        {solvedHere && cursor < step.items.length - 1 ? (
          <button className="btn btn-primary" type="button" style={{ marginTop: 12 }} onClick={() => setCursor((value) => value + 1)}>
            Weiter
          </button>
        ) : null}
      </div>
    </>
  );
}

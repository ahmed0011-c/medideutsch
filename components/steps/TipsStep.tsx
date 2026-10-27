"use client";

import type { TipsStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { CaseMarks, RichText } from "@/components/lesson/bits";
import { stripCaseMarks } from "@/lib/tokens";

export function TipsStepView({ step }: { step: TipsStep }) {
  const { lesson, progress, patch, award, speak } = useLesson();
  const got = step.tips.filter((_, index) => progress.tips[`${step.id}:${index}`]).length;
  return (
    <div>
      <div className="instructions">
        <span className="emoji">💡</span>
        <span>
          Read each trick, listen to the examples, then press <b>Got it</b> to collect it (+
          {lesson.scoring.tipPoints} ⭐ each). Collected: <b>{got}/{step.tips.length}</b>
        </span>
      </div>
      <div className="tipgrid">
        {step.tips.map((tip, index) => {
          const key = `${step.id}:${index}`;
          const done = Boolean(progress.tips[key]);
          const color = tip.color ?? "N";
          return (
            <div key={tip.title} className={`tip c-${color}${done ? " done" : ""}`} style={{ animationDelay: `${index * 40}ms` }}>
              <div className="sticker emoji">{tip.emoji ?? "💡"}</div>
              <div className="tnum">Tip {index + 1}</div>
              <h3>{tip.title}</h3>
              <p>
                <RichText html={tip.rule ?? tip.body ?? ""} />
              </p>
              <div>
                {(tip.examples ?? []).map((example) => (
                  <div key={example.de} className="tex">
                    <button className="say" type="button" title="Listen" onClick={() => void speak(stripCaseMarks(example.de))}>
                      🔊
                    </button>
                    <div>
                      <div>
                        <CaseMarks text={example.de} />
                      </div>
                      <div className="exen">{example.en}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn got"
                type="button"
                onClick={(event) => {
                  if (done) return;
                  patch((current) => ({ ...current, tips: { ...current.tips, [key]: true } }));
                  award(`t:${step.id}:${index}`, lesson.scoring.tipPoints, event.currentTarget);
                }}
              >
                {done ? "✓ Collected" : "👍 Got it"}
              </button>
              <div className="stamp2">GOT IT</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

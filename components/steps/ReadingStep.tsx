"use client";

import type { ReadingStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { ClickableText, McBlock } from "@/components/lesson/bits";
import { plainText } from "@/lib/tokens";

export function ReadingStepView({ step }: { step: ReadingStep }) {
  const { speak } = useLesson();
  const doc = step.document;
  const whole = [doc.title, ...doc.paragraphs].map(plainText).join(" ");
  return (
    <div>
      <div className="instructions">
        <span className="emoji">📄</span>
        <span>{step.instructions}</span>
      </div>
      <div className="reading-grid">
        <div className="paper">
          <div className="lh">
            <span className="emoji">🏥</span>
            {doc.letterhead}
            <button className="say" type="button" style={{ marginLeft: "auto" }} title="Listen" onClick={() => void speak(whole)}>
              🔊 Listen
            </button>
          </div>
          <h3>
            <ClickableText text={doc.title} sentence={plainText(doc.title)} />
          </h3>
          {doc.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              <ClickableText text={paragraph} sentence={plainText(paragraph)} />
            </p>
          ))}
          <div className="sig">
            <ClickableText text={doc.signature} sentence={plainText(doc.signature)} />
          </div>
          {doc.stamp ? <div className="stamp">{doc.stamp}</div> : <div className="stamp">STATION</div>}
        </div>
        <div className="card">
          <h2>❓ Questions</h2>
          {step.questions.map((question, index) => (
            <McBlock key={question.q} question={question} itemKey={`r:${step.id}:${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

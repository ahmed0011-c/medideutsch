"use client";

import { useState } from "react";
import type { DialogueStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { plainText } from "@/lib/tokens";
import { ClickableText } from "@/components/lesson/bits";
import { ExploreMeter } from "@/components/steps/OverviewStep";

export function DialogueStepView({ step }: { step: DialogueStep }) {
  const { progress, patch, speak, cancelSpeech, toast } = useLesson();
  const [speaking, setSpeaking] = useState<number | null>(null);

  async function playAll() {
    if (typeof window !== "undefined" && !("speechSynthesis" in window)) {
      toast("Audio is not supported in this browser.");
      return;
    }
    cancelSpeech();
    for (let i = 0; i < step.lines.length; i++) {
      setSpeaking(i);
      await speak(plainText(step.lines[i].de));
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    setSpeaking(null);
  }

  return (
    <div>
      <div className="scene">
        <div className="bed emoji">🛏️</div>
        <div>
          <b>{step.sceneTitle ?? step.title}</b>
          <span>{step.scene}</span>
        </div>
      </div>
      <div className="instructions">
        <span className="emoji">👆</span>
        <span>{step.instructions}</span>
      </div>
      <div className={`card${progress.showEn ? " show-en" : ""}${progress.highlight ? " hl-modals" : ""}`}>
        <div className="dialog-tools">
          <button className="btn btn-primary" type="button" onClick={() => void playAll()}>
            ▶ Play dialogue
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => patch((current) => ({ ...current, showEn: !current.showEn }))}
          >
            {progress.showEn ? "🙈 Hide" : "🇬🇧 Show"} English
          </button>
          {step.highlight ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => patch((current) => ({ ...current, highlight: !current.highlight }))}
            >
              🖍️ {progress.highlight ? "Hide" : step.highlight.button}
            </button>
          ) : null}
          <ExploreMeter />
        </div>
        <div className="chat">
          {step.lines.map((line, index) => {
            const speaker = step.speakers[line.who];
            return (
              <div key={index} className={`line ${line.who}`} style={{ animationDelay: `${index * 60}ms` }}>
                <div className="avatar emoji">{speaker?.avatar}</div>
                <div className={`bubble${speaking === index ? " speaking" : ""}`}>
                  <div className="who">
                    {speaker?.name} · <span>{speaker?.role}</span>
                    <button
                      className="say"
                      type="button"
                      title="Listen"
                      onClick={(event) => {
                        event.stopPropagation();
                        void speak(plainText(line.de));
                      }}
                    >
                      🔊
                    </button>
                  </div>
                  <div className="de">
                    <ClickableText text={line.de} explore sentence={plainText(line.de)} />
                  </div>
                  <div className="en">{line.en}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

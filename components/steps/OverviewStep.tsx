"use client";

import { useState } from "react";
import type { OverviewStep } from "@/lib/lesson-schema";
import { useLesson } from "@/lib/lesson-context";
import { plainText } from "@/lib/tokens";
import { ClickableText, RichText } from "@/components/lesson/bits";
import { Illustration } from "@/components/illustrations";

export function OverviewStepView({ step }: { step: OverviewStep }) {
  const { lesson, progress, patch, speak } = useLesson();
  const [showEn, setShowEn] = useState(progress.showEn);
  const cases = lesson.cases;
  const sentences = step.text.de.split(/(?<=[.!?])\s+/);

  return (
    <div>
      <div className="hero-lesson">
        <div className="big emoji">🏥</div>
        <div>
          <h2>
            {lesson.unit} · {lesson.title}
          </h2>
          <p>{lesson.subtitle}</p>
        </div>
      </div>
      <div className="grid2">
        <div className="card">
          <h2>🎯 What you&apos;ll learn</h2>
          <ul className="learn-list">
            {step.learn.map((item) => (
              <li key={item}>
                <span className="chk">✓</span>
                <span>
                  <RichText html={item} />
                </span>
              </li>
            ))}
          </ul>
          <div className="meta">
            <span>⏱️ about {step.minutes ?? 20} min</span>
            <span>📶 {lesson.level}</span>
            <span>🩺 Hospital German</span>
          </div>
        </div>
        {cases ? (
          <div className="card">
            <h2>🧭 The four cases at a glance</h2>
            {(["N", "A", "D", "G"] as const).map((id) => (
              <div key={id} className={`peek c-${id}`}>
                <span className="em emoji">{cases[id].emoji}</span>
                <b>{cases[id].name}</b>
                <span className="q">{cases[id].q}</span>
                <span className="r">{cases[id].role}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <h2>🩺 On the ward</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Every example in this chapter happens in a German hospital. Tap the words in the
              reading — articles, plurals and a short note open up.
            </p>
          </div>
        )}
      </div>
      <div className="card">
        <h2>
          🗂️ Key vocabulary{" "}
          <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
            · tap a card to hear it ·
          </span>{" "}
          <span style={{ fontSize: 15 }}>
            <b className="art-der">der</b> · <b className="art-die">die</b> · <b className="art-das">das</b>
          </span>
        </h2>
        <div className="vocab">
          {step.vocab.map((card) => (
            <button
              key={card.de}
              type="button"
              className={`vcard${card.article ? ` g-${card.article}` : ""}`}
              onClick={() => void speak(card.article ? `${card.article} ${card.de}` : card.de)}
            >
              {card.image?.type === "svg" ? (
                <span className="vpic">
                  <Illustration id={card.image.id} />
                </span>
              ) : (
                <span className="vpic emoji">{card.emoji ?? "🔤"}</span>
              )}
              <span className="vde">
                {card.article ? <span className={`art-${card.article}`}>{card.article} </span> : null}
                {card.de}
              </span>
              {card.plural ? <span className="vpl">Pl.: {card.plural}</span> : null}
              <span className="ven">{card.en}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`card${progress.showCases ? " show-cases" : ""}`}>
        <div className="dialog-tools">
          <h2 style={{ margin: "0 8px 0 0" }}>📖 {step.text.title}</h2>
          <button className="btn btn-primary" type="button" onClick={() => void speak(plainText(step.text.de))}>
            ▶ Listen
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setShowEn((value) => !value);
              patch((current) => ({ ...current, showEn: !current.showEn }));
            }}
          >
            {showEn ? "🙈 Hide" : "🇬🇧 Show"} English
          </button>
          {cases ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => patch((current) => ({ ...current, showCases: !current.showCases }))}
            >
              🎨 {progress.showCases ? "Hide" : "Show"} cases
            </button>
          ) : null}
          <ExploreMeter />
        </div>
        <p className="easy-text" data-explore="true">
          {sentences.map((sentence, index) => (
            <span key={index}>
              {index > 0 ? " " : null}
              <ClickableText text={sentence} explore sentence={plainText(sentence)} />
            </span>
          ))}
        </p>
        {showEn ? <p className="easy-en">{step.text.en}</p> : null}
        {cases ? (
          <div className="legend-cases">
            Tap any word. With “Show cases”, articles wear their case colour:{" "}
            {(["N", "A", "D", "G"] as const).map((id) => (
              <span key={id} className={`cm cm-${id}`}>
                {cases[id].name}
              </span>
            ))}
          </div>
        ) : (
          <div className="legend-cases">Tap any German word for the article, plural and a picture.</div>
        )}
      </div>
    </div>
  );
}

export function ExploreMeter() {
  const { lesson, progress } = useLesson();
  const n = Object.keys(progress.pts).filter((key) => key.startsWith("w:")).length;
  const max = lesson.scoring.wordExplorePoints;
  return (
    <div className="explore-meter">
      Words explored{" "}
      <span className="meter">
        <i style={{ width: `${Math.min(100, (n / Math.max(1, max)) * 100)}%` }} />
      </span>{" "}
      <span>
        {Math.min(n, max)}/{max} ⭐
      </span>
    </div>
  );
}

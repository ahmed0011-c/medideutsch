"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cardsForLevel, type CourseCard } from "@/content/curriculum";
import { starsFor, totalPoints, type Scoring } from "@/lib/scoring";
import { createProgressStore } from "@/lib/storage";

export type CatalogLesson = {
  id: string;
  title: string;
  level: string;
  unit: string;
  subtitle: string;
  max: number;
  scoring: Scoring;
};

export function CourseMap({ catalog }: { catalog: CatalogLesson[] }) {
  const byId = new Map(catalog.map((lesson) => [lesson.id, lesson]));
  const [scores, setScores] = useState<Record<string, { total: number; stars: number }>>({});

  useEffect(() => {
    const store = createProgressStore();
    const next: Record<string, { total: number; stars: number }> = {};
    for (const lesson of catalog) {
      const saved = store.load(lesson.id);
      if (!saved) continue;
      const total = totalPoints(saved.pts);
      next[lesson.id] = { total, stars: starsFor(lesson.max ? total / lesson.max : 0, lesson.scoring.stars) };
    }
    setScores(next);
  }, [catalog]);

  return (
    <div>
      {(["A1", "A2", "B1"] as const).map((level) => (
        <section key={level} className="level-band">
          <h2>{level}</h2>
          <div className="lib-grid">
            {cardsForLevel(level).map((card) => (
              <ChapterCard key={card.chapters.map((chapter) => chapter.number).join("-")} card={card} lesson={card.lessonId ? byId.get(card.lessonId) : undefined} score={card.lessonId ? scores[card.lessonId] : undefined} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChapterCard({
  card,
  lesson,
  score,
}: {
  card: CourseCard;
  lesson?: CatalogLesson;
  score?: { total: number; stars: number };
}) {
  const numbers = card.chapters.map((chapter) => chapter.number).join("–");
  const title = card.chapters.length > 1 ? lesson?.title ?? card.chapters[0].title : card.chapters[0].title;
  const body = (
    <>
      <div className="card-kicker">
        Ch. {numbers} · {card.chapters[0].section}
      </div>
      <h3>{title}</h3>
      <p>{card.chapters[0].topic}</p>
      <p className="muted">{card.chapters.map((chapter) => chapter.situation).join(" ")}</p>
      {lesson ? (
        <div className="card-foot">
          <span>{lesson.level}</span>
          {score && score.total > 0 ? (
            <span>
              {score.total}/{lesson.max}
              {score.stars > 0 ? ` · ${"⭐".repeat(score.stars)}` : ""}
            </span>
          ) : (
            <span>Not started</span>
          )}
        </div>
      ) : (
        <div className="card-foot">
          <span className="soon-pill">Coming soon</span>
        </div>
      )}
    </>
  );
  if (!lesson || !card.lessonId) {
    return <article className="lesson-card soon">{body}</article>;
  }
  const levelSlug = lesson.level.toLowerCase().startsWith("a1") ? "a1" : lesson.level.toLowerCase();
  return (
    <Link className="lesson-card" href={`/learn/${levelSlug}/${card.lessonId}`}>
      {body}
    </Link>
  );
}

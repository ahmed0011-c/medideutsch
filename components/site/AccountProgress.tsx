"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { starsFor, totalPoints, type Scoring } from "@/lib/scoring";
import { createProgressStore, type SavedProgress } from "@/lib/storage";

type Row = {
  id: string;
  title: string;
  level: string;
  max: number;
  scoring: Scoring;
};

export function AccountProgress({ lessons }: { lessons: Array<Omit<Row, "scoring"> & { max: number }> }) {
  const [rows, setRows] = useState<Array<{ lesson: (typeof lessons)[number]; saved: SavedProgress }>>([]);

  useEffect(() => {
    const store = createProgressStore();
    const found = lessons
      .map((lesson) => ({ lesson, saved: store.load(lesson.id) }))
      .filter((row): row is { lesson: (typeof lessons)[number]; saved: SavedProgress } => row.saved !== null);
    setRows(found);
  }, [lessons]);

  if (!rows.length) {
    return (
      <div className="card">
        <h2>No scores yet</h2>
        <p>Finish a step in any lesson and the points will show up here.</p>
        <Link className="btn btn-primary" href="/learn">
          Browse lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="lib-grid">
      {rows.map(({ lesson, saved }) => {
        const total = Math.max(0, totalPoints(saved.pts));
        const stars = starsFor(lesson.max ? total / lesson.max : 0, { "3": 0.9, "2": 0.7, "1": 0.4 });
        return (
          <article key={lesson.id} className="lesson-card" style={{ cursor: "default" }}>
            <div className="card-kicker">{lesson.level}</div>
            <h3>{lesson.title}</h3>
            <p>
              {total} / {lesson.max} points · {"⭐".repeat(stars) || "no stars yet"}
            </p>
            <p className="muted">Step {saved.stepIndex + 1} · updated {saved.updatedAt.slice(0, 16).replace("T", " ")}</p>
            {saved.completedAt ? <p>Mastered</p> : null}
            <Link href={`/learn/${lesson.level.toLowerCase().startsWith("a1") ? "a1" : lesson.level.toLowerCase()}/${lesson.id}`}>
              Continue
            </Link>
          </article>
        );
      })}
    </div>
  );
}

import { SiteHeader } from "@/components/site/SiteHeader";
import { CourseMap } from "@/components/site/CourseMap";
import { getAllLessons } from "@/lib/lessons";
import { scoreSections } from "@/lib/scoring";

export default function LearnPage() {
  const catalog = getAllLessons().map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    level: lesson.level,
    unit: lesson.unit,
    subtitle: lesson.subtitle,
    max: scoreSections(lesson.steps, lesson.scoring).reduce((sum, section) => sum + section.max, 0),
    scoring: lesson.scoring,
  }));
  return (
    <>
      <SiteHeader />
      <main>
        <p className="kicker">Course map</p>
        <h1 style={{ marginTop: 0 }}>Lessons by level</h1>
        <p className="muted">
          The order follows a level path, not the book&apos;s topic order. A card with a chapter
          number and no link is planned. Open a ready lesson to start; your score stays in this
          browser.
        </p>
        <CourseMap catalog={catalog} />
      </main>
    </>
  );
}

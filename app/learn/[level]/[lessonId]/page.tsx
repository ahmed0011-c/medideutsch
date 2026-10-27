import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { getAllLessons, getLessonById, lessonPathSlugs } from "@/lib/lessons";

export function generateStaticParams() {
  return getAllLessons().flatMap((lesson) =>
    lessonPathSlugs(lesson.level).map((level) => ({ level, lessonId: lesson.id })),
  );
}

export default async function LessonPage({ params }: { params: Promise<{ level: string; lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}

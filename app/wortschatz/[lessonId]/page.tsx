import { notFound } from "next/navigation";
import { ComicPlayer } from "@/components/comic/ComicPlayer";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAllComics, getComicById } from "@/lib/comics";

export function generateStaticParams() {
  return getAllComics().map((lesson) => ({ lessonId: lesson.id }));
}

export default async function ComicLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getComicById(lessonId);
  if (!lesson) notFound();
  return (
    <>
      <SiteHeader />
      <ComicPlayer lesson={lesson} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HoerenPlayer } from "@/components/hoeren/HoerenPlayer";
import { getAllHoeren, getHoerenBySlug } from "@/lib/hoeren";

export function generateStaticParams() {
  return getAllHoeren().map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getHoerenBySlug(slug);
  if (!lesson) return { title: "Hören — MediDeutsch" };
  return {
    title: `${lesson.title} — Hören — MediDeutsch`,
    description: lesson.summary,
  };
}

export default async function HoerenLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getHoerenBySlug(slug);
  if (!lesson) notFound();
  return (
    <>
      <SiteHeader />
      <main>
        <HoerenPlayer lesson={lesson} />
      </main>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAllHoeren } from "@/lib/hoeren";

export const metadata: Metadata = {
  title: "Hören — MediDeutsch",
  description: "German listening lessons with video, color-coded script, and simple questions.",
};

export default function HoerenIndexPage() {
  const lessons = getAllHoeren();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-home">
          <p className="kicker">Hören · A2 pilot</p>
          <h1>Video hören, Skript lesen, Fragen beantworten.</h1>
          <p>
            Jede Lektion hat zwei Teile: das Video mit farbigem, anklickbarem Skript und einfache
            Multiple-Choice-Fragen auf Deutsch.
          </p>
        </section>
        <section className="track" aria-labelledby="hoeren-list">
          <h2 id="hoeren-list">Lektionen</h2>
          <div className="track-cards">
            {lessons.map((lesson) => (
              <Link key={lesson.id} className="lesson-card" href={`/hoeren/${lesson.slug}`}>
                <div className="card-kicker">
                  {lesson.level} · {lesson.series} · Folge {lesson.episode}
                </div>
                <h3>{lesson.title}</h3>
                <p>{lesson.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

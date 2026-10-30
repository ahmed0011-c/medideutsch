import Link from "next/link";
import { wortschatzSoon } from "@/content/comic-catalog";
import { getAllComics } from "@/lib/comics";
import { getAllLessons } from "@/lib/lessons";
import { getAllHoeren } from "@/lib/hoeren";

function levelSlug(level: string) {
  const lower = level.toLowerCase();
  if (lower.startsWith("b1")) return "b1";
  if (lower.startsWith("a2")) return "a2";
  return "a1";
}

export function HomeTracks({ mode = "all" }: { mode?: "all" | "wortschatz" }) {
  const lessons = getAllLessons().slice().sort((a, b) => a.id.localeCompare(b.id));
  const comics = getAllComics();
  const hoeren = getAllHoeren();

  return (
    <div className="home-tracks">
      {mode === "wortschatz" ? null : (
      <section className="track" aria-labelledby="grammatik-heading">
        <h2 id="grammatik-heading">Grammatik</h2>
        <p className="muted">
          A1 to B1 on the ward: pronouns, verb position, cases, connectors. The map lists every
          chapter; these lessons are ready to play.
        </p>
        <div className="track-cards">
          {lessons.map((lesson) => (
            <Link key={lesson.id} className="lesson-card" href={`/learn/${levelSlug(lesson.level)}/${lesson.id}`}>
              <div className="card-kicker">
                {lesson.level} · {lesson.unit}
              </div>
              <h3>{lesson.title}</h3>
              <p>{lesson.subtitle}</p>
            </Link>
          ))}
        </div>
        <p>
          <Link href="/learn">Open the full grammar map</Link>
        </p>
      </section>
      )}
      {mode === "wortschatz" ? null : (

      <section className="track" aria-labelledby="hoeren-heading">
        <h2 id="hoeren-heading">Hören</h2>
        <p className="muted">
          Kurze Videos mit farbigem Skript und einfachen Fragen. Pilot: Nicos Weg A2.
        </p>
        <div className="track-cards">
          {hoeren.map((lesson) => (
            <Link key={lesson.id} className="lesson-card" href={`/hoeren/${lesson.slug}`}>
              <div className="card-kicker">
                {lesson.level} · {lesson.series} · Folge {lesson.episode}
              </div>
              <h3>{lesson.title}</h3>
              <p>{lesson.subtitle}</p>
            </Link>
          ))}
        </div>
        <p>
          <Link href="/hoeren">Alle Hörlektionen</Link>
        </p>
      </section>
      )}
      <section className="track" aria-labelledby="wortschatz-heading">
        <h2 id="wortschatz-heading">Wortschatz</h2>
        <p className="muted">
          Each lesson is a vertical comic. Tap any German word, then keep the terms you have learned.
        </p>
        <div className="track-cards">
          {comics.map((comic) => (
            <Link key={comic.id} className="lesson-card" href={`/wortschatz/${comic.id}`}>
              <div className="card-kicker">{comic.level} · Jetzt</div>
              <h3>
                {comic.title}: {comic.subtitle}
              </h3>
              <p>
                {comic.chapters.length} Seiten · {comic.panels.length} Bilder · {comic.vocab.length} Schlüsselwörter
              </p>
            </Link>
          ))}
          {wortschatzSoon.map((card) => (
            <article key={card.title} className="lesson-card soon">
              <div className="card-kicker">{card.level} · Bald</div>
              <h3>
                {card.emoji} {card.title}
              </h3>
              <p>{card.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

import { SiteHeader } from "@/components/site/SiteHeader";
import { AccountProgress } from "@/components/site/AccountProgress";
import { getAllLessons } from "@/lib/lessons";
import { scoreSections } from "@/lib/scoring";

export default function AccountPage() {
  const lessons = getAllLessons().map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    level: lesson.level,
    max: scoreSections(lesson.steps, lesson.scoring).reduce((sum, section) => sum + section.max, 0),
  }));
  return (
    <>
      <SiteHeader />
      <main>
        <p className="kicker">This browser</p>
        <h1 style={{ marginTop: 0 }}>Your progress</h1>
        <p className="muted">
          Nothing here is sent to a server. Clearing site data removes these scores. A future
          account page can read the same records from a database.
        </p>
        <AccountProgress lessons={lessons} />
      </main>
    </>
  );
}

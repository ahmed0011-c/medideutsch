import { SiteHeader } from "@/components/site/SiteHeader";
import { GrammarReference } from "@/components/grammar/GrammarReference";
import { getLessonById } from "@/lib/lessons";

export default function GrammarPage() {
  const lesson = getLessonById("a1a2-faelle-krankenhaus");
  if (!lesson) {
    return (
      <>
        <SiteHeader />
        <main>
          <p>The cases lesson is not in the catalog yet.</p>
        </main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <main>
        <p className="kicker">Grammar reference</p>
        <h1 style={{ marginTop: 0 }}>Die Fälle im Krankenhaus</h1>
        <p className="muted">
          Nominativ asks who does something, Akkusativ asks whom or what, Dativ asks to whom, and
          Genitiv asks whose. The table below is the same one used in chapters 16 and 17. Akkusativ
          is rose so it does not blend into the masculine article blue.
        </p>
        <GrammarReference lesson={lesson} />
      </main>
    </>
  );
}

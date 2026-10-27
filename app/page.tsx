import { SiteHeader } from "@/components/site/SiteHeader";
import { HomeTracks } from "@/components/site/HomeTracks";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-home">
          <p className="kicker">A1–B1 · Hospital German</p>
          <h1>Grammar and vocabulary for the ward.</h1>
          <p>
            MediDeutsch is for international medical students and doctors. Grammatik follows a
            standard A1–B1 path. Wortschatz is a scrolling comic: a night shift, a new patient, and
            the words you need at the bedside.
          </p>
        </section>
        <HomeTracks />
      </main>
    </>
  );
}

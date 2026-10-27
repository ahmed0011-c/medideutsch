import { SiteHeader } from "@/components/site/SiteHeader";
import { HomeTracks } from "@/components/site/HomeTracks";

export default function WortschatzPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <p className="kicker">Wortschatz</p>
        <h1 style={{ marginTop: 0 }}>Comics from the ward</h1>
        <p className="muted">
          A lesson is one long scene you scroll like a webtoon. Coming-soon cards already name the
          next situations: admission, the ward round, and discharge.
        </p>
        <HomeTracks mode="wortschatz" />
      </main>
    </>
  );
}

import Link from "next/link";
import { BrandMark } from "@/components/illustrations";
import { WortbankNavLink } from "@/components/site/WortbankNavLink";

export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand-link" aria-label="MediDeutsch home">
          <BrandMark />
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/learn">Grammatik</Link>
          <Link href="/wortschatz">Wortschatz</Link>
          <WortbankNavLink />
          <Link href="/grammar">Cases</Link>
          <Link href="/account">Progress</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LookupNavLink() {
  const pathname = usePathname() ?? "";
  return (
    <Link
      href="/wortbank#lookup"
      onClick={() => {
        if (pathname.replace(/\/$/, "") !== "/wortbank") return;
        window.setTimeout(() => {
          document.getElementById("lookup")?.scrollIntoView({ block: "start" });
          document.getElementById("lookup-input")?.focus();
        }, 0);
      }}
    >
      Look up
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createProgressStore } from "@/lib/storage";
import { WORTBANK_EVENT } from "@/lib/wortbank";

export function WortbankNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function read() {
      setCount(createProgressStore().loadWortbank()?.entries.length ?? 0);
    }
    read();
    window.addEventListener(WORTBANK_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(WORTBANK_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return (
    <Link href="/wortbank" aria-label={count ? `Wortbank, ${count} saved` : "Wortbank"}>
      Wortbank
      {count > 0 ? <span className="nav-badge">{count}</span> : null}
    </Link>
  );
}

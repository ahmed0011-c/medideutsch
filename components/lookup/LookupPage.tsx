"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LookupBox } from "@/components/wortbank/LookupBox";
import { createProgressStore } from "@/lib/storage";
import { emptyWortbank, notifyWortbank, upsertWortbank, WORTBANK_EVENT, type WortbankDoc, type WortbankDraft } from "@/lib/wortbank";

export function LookupPage() {
  const router = useRouter();
  const [doc, setDoc] = useState<WortbankDoc>(emptyWortbank());
  const [request, setRequest] = useState<{ id: number; word: string } | null>(null);

  useEffect(() => {
    setDoc(createProgressStore().loadWortbank() ?? emptyWortbank());
    const word = new URLSearchParams(window.location.search).get("q");
    if (word) setRequest({ id: Date.now(), word });
    document.getElementById("lookup-input")?.focus();
  }, []);

  useEffect(() => {
    function refresh() {
      setDoc(createProgressStore().loadWortbank() ?? emptyWortbank());
    }
    window.addEventListener(WORTBANK_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WORTBANK_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function add(draft: WortbankDraft) {
    const store = createProgressStore();
    const next = upsertWortbank(store.loadWortbank() ?? emptyWortbank(), draft);
    store.saveWortbank(next);
    notifyWortbank();
    setDoc(next);
  }

  return (
    <>
      <SiteHeader />
      <main id="nachschlagen">
        <p className="kicker">Wörterbuch</p>
        <h1 style={{ marginTop: 0 }}>Look up</h1>
        <p className="muted">
          Type any German word. You get the English meaning, and the article, plural, or verb forms a learner needs.
          Then add it to your <Link href="/wortbank">Wortbank</Link>.
        </p>
        <LookupBox entries={doc.entries} request={request} onAdd={add} onShow={() => router.push("/wortbank")} />
      </main>
    </>
  );
}

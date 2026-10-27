"use client";

import { useEffect, useState } from "react";
import { lookupVerb } from "@/lib/verbs";
import { createProgressStore } from "@/lib/storage";
import {
  emptyWortbank,
  entryId,
  notifyWortbank,
  toggleHard,
  upsertWortbank,
  type WortbankDraft,
} from "@/lib/wortbank";

export function SeparableSplit({ lemma }: { lemma: string }) {
  const verb = lookupVerb(lemma);
  if (!verb?.separable) return null;
  return (
    <div className="wb-split" data-testid="verb-split">
      <span className="wb-prefix">{verb.separable}</span>
      <span className="wb-pipe">|</span>
      <span>{lemma.slice(verb.separable.length)}</span>
    </div>
  );
}

export function WortbankSaveButtons({ draft, onChange }: { draft: WortbankDraft; onChange?: () => void }) {
  const id = entryId(draft.lessonId, draft.key);
  const [hard, setHard] = useState<boolean | null>(null);

  useEffect(() => {
    const doc = createProgressStore().loadWortbank() ?? emptyWortbank();
    const found = doc.entries.find((entry) => entry.id === id);
    setHard(found ? found.hard : null);
  }, [id]);

  function write(makeHard?: boolean) {
    const store = createProgressStore();
    let doc = upsertWortbank(store.loadWortbank() ?? emptyWortbank(), draft);
    if (makeHard !== undefined) {
      const current = doc.entries.find((entry) => entry.id === id);
      if (current && current.hard !== makeHard) doc = toggleHard(doc, id);
    }
    store.saveWortbank(doc);
    notifyWortbank();
    setHard(doc.entries.find((entry) => entry.id === id)?.hard ?? false);
    onChange?.();
  }

  return (
    <>
      <button
        className={`btn btn-soft btn-sm${hard !== null ? " wb-saved" : ""}`}
        type="button"
        data-testid="wortbank-save"
        onClick={(event) => {
          event.stopPropagation();
          write();
        }}
      >
        {hard !== null ? "⭐ Gespeichert" : "⭐ Speichern"}
      </button>
      {hard !== null ? (
        <button
          className={`btn btn-ghost btn-sm${hard ? " wb-hard" : ""}`}
          type="button"
          data-testid="wortbank-hard"
          aria-pressed={hard}
          onClick={(event) => {
            event.stopPropagation();
            write(!hard);
          }}
        >
          {hard ? "★ Schwer" : "☆ Schwer"}
        </button>
      ) : null}
    </>
  );
}

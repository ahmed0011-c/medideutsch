"use client";

import { familyFor, mnemonicFor } from "@/lib/families";

export function MemoryPicture({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="wb-picture" role="img" aria-label={label}>
      <svg viewBox="0 0 320 150" className="wb-picture-svg" aria-hidden="true">
        <rect width="320" height="150" rx="18" fill="#e6f7f5" />
        <rect x="24" y="78" width="118" height="40" rx="10" fill="#0f2a3d" />
        <rect x="34" y="62" width="36" height="22" rx="6" fill="#ffffff" />
        <rect x="168" y="28" width="18" height="64" rx="4" fill="#0d9488" />
        <rect x="146" y="46" width="62" height="18" rx="4" fill="#0d9488" />
        <circle cx="250" cy="74" r="36" fill="#ffffff" />
      </svg>
      <span className="wb-picture-emoji">{emoji}</span>
    </div>
  );
}

export function MemoryCard({
  lemma,
  emoji,
  story,
  onStory,
}: {
  lemma: string;
  emoji: string;
  story: string;
  onStory: (story: string) => void;
}) {
  const curated = mnemonicFor(lemma);
  const family = familyFor(lemma);
  const picture = curated?.emoji || emoji || "🔤";
  return (
    <div className="wb-memory">
      {(curated || family) && (
        <MemoryPicture emoji={picture} label={curated ? curated.story : lemma} />
      )}
      <section className="wb-story" data-testid="memory-story">
        <h3>Merkgeschichte</h3>
        {curated ? <p>{curated.story}</p> : <p className="muted">Für dieses Wort gibt es noch keine fertige Geschichte.</p>}
        <label className="wb-own">
          Deine eigene Geschichte
          <textarea
            value={story}
            rows={2}
            placeholder="Ein Satz, den du dir merken kannst."
            onChange={(event) => onStory(event.target.value)}
          />
        </label>
      </section>
      <section className="wb-family" data-testid="word-family">
        <h3>Wortfamilie</h3>
        {family ? (
          <ul>
            {family.forms.map((form) => (
              <li key={form.form}>
                <b>{form.form}</b>
                <span>{form.pos}</span>
                <small>{form.en}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Für dieses Wort ist noch keine Wortfamilie hinterlegt.</p>
        )}
      </section>
    </div>
  );
}

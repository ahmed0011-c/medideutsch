"use client";

import { useSpeech } from "@/lib/audio";
import { lookupVerb, tenseRows, type TenseTable } from "@/lib/verbs";

function SplitCell({ text }: { text: string }) {
  const parts = text.split(" … ");
  if (parts.length !== 2) return <>{text}</>;
  return (
    <>
      {parts[0]} <span className="wb-gap">…</span> <span className="wb-prefix">{parts[1]}</span>
    </>
  );
}

export function VerbExplorer({ lemma }: { lemma: string }) {
  const speech = useSpeech();
  const verb = lookupVerb(lemma);
  if (!verb) return null;
  const rows = tenseRows(lemma.toLowerCase(), verb);
  const main = rows.filter((row) => row.id !== "imperativ");
  const imperativ = rows.find((row) => row.id === "imperativ") as TenseTable;
  return (
    <section className="wb-explorer" data-testid="verb-explorer">
      <div className="wb-explorer-head">
        <h3>Konjugation</h3>
        {verb.separable ? (
          <p className="muted">Das Präfix steht in der Satzklammer am Ende. Im Infinitiv und im Partizip bleibt es dran.</p>
        ) : null}
        {verb.inseparable ? (
          <p className="muted">
            <b>{verb.inseparable}-</b> ist unbetont und bleibt am Verb.
          </p>
        ) : null}
      </div>
      <div className="wb-grid-wrap">
        <table className="wb-grid">
          <thead>
            <tr>
              <th />
              {main.map((row) => (
                <th key={row.id} scope="col">
                  {row.label}
                  <button className="icon-btn" type="button" aria-label={`${row.label} anhören`} onClick={() => void speech.speak(row.example)}>
                    ▶
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {main[0].persons.map((person, index) => (
              <tr key={person}>
                <th scope="row">{person}</th>
                {main.map((row) => (
                  <td key={row.id}>
                    <SplitCell text={row.cells[index] ?? "—"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="wb-grid-wrap">
        <table className="wb-grid">
          <thead>
            <tr>
              <th scope="col">
                Imperativ
                <button className="icon-btn" type="button" aria-label="Imperativ anhören" onClick={() => void speech.speak(imperativ.example)}>
                  ▶
                </button>
              </th>
              {imperativ.persons.map((person) => (
                <th key={person} scope="col">
                  {person}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row"> </th>
              {imperativ.cells.map((cell, index) => (
                <td key={imperativ.persons[index]}>
                  <SplitCell text={cell} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="wb-examples">
        {rows.map((row) => (
          <li key={row.id}>
            <b>{row.label}.</b> {row.example}
          </li>
        ))}
      </ul>
      {verb.note ? <p className="note">{verb.note}</p> : null}
    </section>
  );
}

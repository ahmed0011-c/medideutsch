"use client";

import { useEffect, useState } from "react";
import { INSEPARABLE_PREFIXES, SEPARABLE_PREFIXES, STRESS_NOTE } from "@/lib/prefixes";
import { lookupVerb, splitTrailingPrefix, VERBS } from "@/lib/verbs";
import type { WortbankEntry } from "@/lib/wortbank";

function Infinitive({ lemma }: { lemma: string }) {
  const verb = lookupVerb(lemma);
  if (!verb?.separable) return <b>{lemma}</b>;
  return (
    <b className="wb-split-lg" data-testid="verb-split">
      <span className="wb-prefix">{verb.separable}</span>
      <span className="wb-pipe">|</span>
      {lemma.slice(verb.separable.length)}
    </b>
  );
}

export function Satzklammer({ lemma }: { lemma: string }) {
  const verb = lookupVerb(lemma);
  const prefix = verb?.separable;
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    if (phase !== 1) return;
    const timer = window.setTimeout(() => setPhase(2), 700);
    return () => window.clearTimeout(timer);
  }, [phase]);
  if (!verb || !prefix) return null;
  const parsed = splitTrailingPrefix(verb.examples.praesens, prefix);
  const before = parsed?.before ?? `Ich ${verb.praesens[0]}`;
  return (
    <div className="wb-klammer" data-phase={phase} data-testid="satzklammer">
      <Infinitive lemma={lemma} />
      <p className="wb-klammer-line">
        {phase === 0 ? <span className="muted">Infinitiv, noch zusammen.</span> : null}
        {phase === 1 ? (
          <>
            {before} <span className="wb-prefix wb-float">{prefix}</span> <span className="wb-slot">am Ende</span>.
          </>
        ) : null}
        {phase === 2 ? (
          <>
            {before} <span className="wb-prefix">{prefix}</span>.
          </>
        ) : null}
      </p>
      <div className="wb-inline">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPhase(0)}>
          Zusammen
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPhase(1)}>
          Sprung
        </button>
        <button className="btn btn-soft btn-sm" type="button" data-testid="satzklammer-end" onClick={() => setPhase(2)}>
          Am Ende
        </button>
      </div>
    </div>
  );
}

export function PrefixDrag({ lemma }: { lemma: string }) {
  const verb = lookupVerb(lemma);
  const prefix = verb?.separable;
  const [placed, setPlaced] = useState(false);
  const [over, setOver] = useState(false);
  useEffect(() => {
    setPlaced(false);
  }, [lemma]);
  if (!verb || !prefix) return null;
  const parsed = splitTrailingPrefix(verb.examples.praesens, prefix);
  const before = parsed?.before ?? `Ich ${verb.praesens[0]}`;
  return (
    <div className="wb-drag" data-testid="prefix-drag">
      <p>
        Zieh das Präfix ans Ende. Tippen geht auch.
      </p>
      <p className="wb-klammer-line">
        {before}{" "}
        <button
          className={`wb-slot${placed ? " ok" : ""}${over ? " over" : ""}`}
          type="button"
          data-testid="prefix-slot"
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setPlaced(true);
            setOver(false);
          }}
          onClick={() => setPlaced(true)}
        >
          {placed ? <span className="wb-prefix">{prefix}</span> : "hierher"}
        </button>
      </p>
      {placed ? (
        <p className="wb-ok">Stimmt. {verb.examples.praesens}</p>
      ) : (
        <button
          className="wb-chip"
          type="button"
          draggable
          data-testid="prefix-chip"
          onDragStart={(event) => event.dataTransfer.setData("text/plain", prefix)}
          onClick={() => setPlaced(true)}
        >
          {prefix}
        </button>
      )}
    </div>
  );
}

export function SeparablePractice({ saved }: { saved: WortbankEntry[] }) {
  const savedVerbs = [...new Set(saved.filter((entry) => lookupVerb(entry.lemma)?.separable).map((entry) => entry.lemma.toLowerCase()))];
  const choices = [...new Set(["aufstehen", ...savedVerbs])];
  const [lemma, setLemma] = useState("aufstehen");
  const current = choices.includes(lemma) ? lemma : "aufstehen";
  const demo = !savedVerbs.includes("aufstehen");
  return (
    <div className="wb-separable">
      <section className="card">
        <h2>Satzklammer</h2>
        <p className="muted">{STRESS_NOTE}</p>
        {demo ? (
          <p className="wb-demo">Beispiel: aufstehen. Gespeicherte trennbare Verben stehen zusätzlich in der Liste.</p>
        ) : null}
        <label className="wb-filter">
          Verb
          <select value={current} onChange={(event) => setLemma(event.target.value)}>
            {choices.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <Satzklammer lemma={current} />
        <PrefixDrag lemma={current} />
      </section>
      <section className="card">
        <h2>Präfixe</h2>
        <ul className="wb-prefixes">
          {SEPARABLE_PREFIXES.map((item) => (
            <li key={item.prefix}>
              <b className="wb-prefix">{item.prefix}</b>
              <span>{item.meaning}</span>
              <small>{item.mnemonic}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>Nicht trennbar</h2>
        <p>{STRESS_NOTE}</p>
        <ul className="wb-prefixes">
          {INSEPARABLE_PREFIXES.map((item) => (
            <li key={item.prefix}>
              <b>{item.prefix}</b>
              <small>{item.examples}</small>
            </li>
          ))}
        </ul>
        <p className="muted">
          {VERBS.wiederholen ? "wiederholen bleibt zusammen. wiederkommen trennt sich." : null}
        </p>
      </section>
    </div>
  );
}

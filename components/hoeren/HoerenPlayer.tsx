"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpeech } from "@/lib/audio";
import { createProgressStore } from "@/lib/storage";
import {
  emptyWortbank,
  entryId,
  notifyWortbank,
  upsertWortbank,
  type WortbankDraft,
} from "@/lib/wortbank";
import type { HoerenLesson, HoerenPos, HoerenToken } from "@/lib/hoeren-schema";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          host?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YtPlayer }) => void;
            onStateChange?: (e: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YtPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};

type PosFlags = Record<HoerenPos, boolean>;

const POS_LABEL: Record<Exclude<HoerenPos, "other">, string> = {
  verb: "Verben",
  noun: "Nomen",
  prep: "Präpositionen",
  compound: "Zusammensetzungen",
};

const PASS = 0.8;
const PROGRESS_PREFIX = "medideutsch:v1:hoeren:";

type ProgressDoc = {
  answers: Record<string, number>;
  completedAt?: string;
  updatedAt: string;
};

function loadProgress(id: string): ProgressDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROGRESS_PREFIX + id);
    return raw ? (JSON.parse(raw) as ProgressDoc) : null;
  } catch {
    return null;
  }
}

function saveProgress(id: string, doc: ProgressDoc) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_PREFIX + id, JSON.stringify(doc));
}

function stripPunct(w: string) {
  return w.replace(/^[„"'(]+|[.!?,;:…'"')]+$/g, "");
}

function tokenKey(lineId: string, index: number, token: HoerenToken) {
  return `${lineId}:${index}:${token.lemma || stripPunct(token.w).toLowerCase()}`;
}

function loadYtApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    // If API already mid-load, poll briefly
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - start > 12_000) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}

export function HoerenPlayer({ lesson }: { lesson: HoerenLesson }) {
  const speech = useSpeech();
  const playerRef = useRef<YtPlayer | null>(null);
  const mountId = `yt-hoeren-${lesson.id}`;
  const lineRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);
  const [currentT, setCurrentT] = useState(0);
  const [scriptHidden, setScriptHidden] = useState(false);
  const [speed, setSpeed] = useState<0.75 | 1>(1);
  const [activePos, setActivePos] = useState<PosFlags>({
    verb: true,
    noun: true,
    prep: true,
    compound: true,
    other: true,
  });
  const [selected, setSelected] = useState<{
    lineId: string;
    index: number;
    token: HoerenToken;
    sentence: string;
  } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [linkHover, setLinkHover] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, "ok" | "bad">>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    const existing = loadProgress(lesson.id);
    if (existing) {
      setAnswers(existing.answers || {});
      if (existing.completedAt) setDone(true);
    }
  }, [lesson.id]);

  useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;
    loadYtApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      const el = document.getElementById(mountId);
      if (!el) return;
      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(mountId, {
        videoId: lesson.videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => {
            if (!cancelled) {
              setReady(true);
              playerRef.current?.setPlaybackRate(speed);
            }
          },
        },
      });
      poll = window.setInterval(() => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;
        try {
          setCurrentT(player.getCurrentTime());
        } catch {
          /* player not ready */
        }
      }, 250);
    });
    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [lesson.videoId, mountId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    try {
      playerRef.current?.setPlaybackRate(speed);
    } catch {
      /* some embeds ignore rate */
    }
  }, [speed, ready]);

  const activeLineId = useMemo(() => {
    let current = lesson.lines[0]?.id ?? "";
    for (const line of lesson.lines) {
      if (line.t <= currentT + 0.15) current = line.id;
      else break;
    }
    return current;
  }, [lesson.lines, currentT]);

  useEffect(() => {
    const el = lineRefs.current[activeLineId];
    if (!el || scriptHidden) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeLineId, scriptHidden]);

  const seek = useCallback((t: number) => {
    const player = playerRef.current;
    if (!player?.seekTo) return;
    player.seekTo(Math.max(0, t), true);
    try {
      player.playVideo();
    } catch {
      /* autoplay may be blocked */
    }
    setCurrentT(t);
  }, []);

  function togglePos(pos: HoerenPos) {
    if (pos === "other") return;
    setActivePos((prev) => ({ ...prev, [pos]: !prev[pos] }));
  }

  function openToken(lineId: string, index: number, token: HoerenToken, sentence: string) {
    if (token.pos === "other" && !token.de && !token.lemma) return;
    setSelected({ lineId, index, token, sentence });
    setSavedFlash(false);
    if (token.link) setLinkHover(token.link);
  }

  function saveToWortbank() {
    if (!selected) return;
    const { token, lineId, index, sentence } = selected;
    const lemma = token.lemma || stripPunct(token.w);
    const draft: WortbankDraft = {
      lessonId: lesson.id,
      lessonTitle: `${lesson.series}: ${lesson.title}`,
      lessonKind: "hoeren",
      key: tokenKey(lineId, index, token),
      surface: stripPunct(token.w),
      lemma,
      pos: token.pos,
      de: token.de || lemma,
      en: token.en || "",
      emoji: token.pos === "verb" ? "🔵" : token.pos === "noun" || token.pos === "compound" ? "🟢" : "🟠",
      sentence,
      href: `/hoeren/${lesson.slug}`,
    };
    const store = createProgressStore();
    const doc = upsertWortbank(store.loadWortbank() ?? emptyWortbank(), draft);
    store.saveWortbank(doc);
    notifyWortbank();
    setSavedFlash(true);
  }

  function isSaved(): boolean {
    if (!selected) return false;
    const id = entryId(lesson.id, tokenKey(selected.lineId, selected.index, selected.token));
    const doc = createProgressStore().loadWortbank() ?? emptyWortbank();
    return doc.entries.some((e) => e.id === id);
  }

  function answerQuestion(qid: string, choice: number, correct: number) {
    const next = { ...answers, [qid]: choice };
    setAnswers(next);
    setFeedback((f) => ({ ...f, [qid]: choice === correct ? "ok" : "bad" }));
    const answered = lesson.questions.filter((q) => next[q.id] !== undefined);
    const right = lesson.questions.filter((q) => next[q.id] === q.answer).length;
    const score = right / lesson.questions.length;
    const completed = answered.length === lesson.questions.length && score >= PASS;
    const doc: ProgressDoc = {
      answers: next,
      updatedAt: new Date().toISOString(),
      completedAt: completed ? new Date().toISOString() : undefined,
    };
    saveProgress(lesson.id, doc);
    setDone(completed);
  }

  const score = useMemo(() => {
    const right = lesson.questions.filter((q) => answers[q.id] === q.answer).length;
    return { right, total: lesson.questions.length, pct: right / lesson.questions.length };
  }, [answers, lesson.questions]);

  return (
    <div className="hoeren">
      <header className="hoeren-head">
        <p className="kicker">
          Hören · {lesson.level} · {lesson.series} · Folge {lesson.episode}
        </p>
        <h1>{lesson.title}</h1>
        <p className="muted">{lesson.subtitle}</p>
        {lesson.timestampsApproximate ? (
          <p className="hoeren-note">Zeitmarken sind Näherungswerte zum Manuskript.</p>
        ) : null}
      </header>

      <section className="hoeren-part card" aria-labelledby="part1">
        <div className="hoeren-part-head">
          <h2 id="part1">Teil 1 · Video + Skript</h2>
          <div className="hoeren-toolbar">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setScriptHidden((v) => !v)}
            >
              {scriptHidden ? "Skript einblenden" : "Skript ausblenden"}
            </button>
            <div className="hoeren-speed" role="group" aria-label="Geschwindigkeit">
              <button
                type="button"
                className={`btn btn-sm ${speed === 0.75 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setSpeed(0.75)}
              >
                0,75×
              </button>
              <button
                type="button"
                className={`btn btn-sm ${speed === 1 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setSpeed(1)}
              >
                1×
              </button>
            </div>
          </div>
        </div>

        <div className={`hoeren-stage${scriptHidden ? " script-hidden" : ""}`}>
          <div className="hoeren-main">
            <div className="hoeren-video-wrap">
              <div className="hoeren-video">
                <div id={mountId} />
              </div>
              {!ready ? <p className="hoeren-video-fallback muted">Video wird geladen …</p> : null}
            </div>

            <p className="hoeren-play-hint">
              <span className="hoeren-play-dot" aria-hidden="true" />
              Video läuft weiter. Tippe im Transkript auf ein Wort, um die Bedeutung zu sehen.
            </p>

            <aside className="hoeren-wortbedeutung" aria-live="polite" aria-label="Wortbedeutung">
              <div className="hoeren-wb-head">
                <span className="hoeren-wb-icon" aria-hidden="true">
                  📖
                </span>
                <h3>Wortbedeutung</h3>
              </div>

              {selected ? (
                <div className="hoeren-wb-body">
                  <div className="hoeren-wb-title">
                    <p className="hoeren-wb-lemma">
                      {selected.token.article && selected.token.article !== "—"
                        ? `${selected.token.article} `
                        : ""}
                      {selected.token.lemma || stripPunct(selected.token.w)}
                    </p>
                    <span className={`hoeren-pos-tag pos-${selected.token.pos}`}>
                      {selected.token.pos === "verb"
                        ? "Verb"
                        : selected.token.pos === "noun"
                          ? "Nomen"
                          : selected.token.pos === "prep"
                            ? "Präposition"
                            : selected.token.pos === "compound"
                              ? "Zusammensetzung"
                              : "Wort"}
                    </span>
                  </div>

                  {selected.token.split?.length ? (
                    <p className="hoeren-split">
                      {selected.token.split.map((part, i) => (
                        <span key={`${part}-${i}`}>
                          {i > 0 ? <span className="hoeren-split-plus"> + </span> : null}
                          <b>{part}</b>
                        </span>
                      ))}
                    </p>
                  ) : null}

                  <div className="hoeren-wb-meanings">
                    <p className="hoeren-wb-row hoeren-de">
                      <span className="hoeren-flag" title="Deutsch" aria-label="Deutsch">
                        🇩🇪
                      </span>
                      <span>{selected.token.de || "—"}</span>
                    </p>
                    <p className="hoeren-wb-row hoeren-en">
                      <span className="hoeren-flag" title="English" aria-label="English">
                        🇬🇧
                      </span>
                      <span>{selected.token.en || "—"}</span>
                    </p>
                  </div>

                  <div className="hoeren-wb-example">
                    <p className="hoeren-wb-example-label">Beispielsatz</p>
                    <p className="hoeren-wb-example-text">
                      {(lesson.lines.find((l) => l.id === selected.lineId)?.tokens ?? []).map((tok, i, arr) => (
                        <span key={`${selected.lineId}-ex-${i}`}>
                          <span className={i === selected.index ? "hoeren-wb-hit" : undefined}>{tok.w}</span>
                          {i < arr.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </p>
                  </div>

                  <div className="hoeren-wb-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm hoeren-wb-speak"
                      onClick={() => speech.speak(selected.token.lemma || stripPunct(selected.token.w))}
                    >
                      🔊 Aussprache anhören
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm hoeren-wb-bank${savedFlash || isSaved() ? " wb-saved" : ""}`}
                      onClick={saveToWortbank}
                    >
                      {savedFlash || isSaved() ? "⭐ In Wortbank" : "⭐ + Wortbank"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="hoeren-wb-empty">
                  Tippe auf ein farbiges Wort im Transkript — die Bedeutung erscheint hier, während das Video weiterläuft.
                </p>
              )}
            </aside>
          </div>

          {!scriptHidden ? (
            <div className="hoeren-script-panel">
              <div className="hoeren-legend" role="group" aria-label="Farblegende">
                {(Object.keys(POS_LABEL) as Array<keyof typeof POS_LABEL>).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className={`hoeren-pill pos-${pos}${activePos[pos] ? " on" : " off"}`}
                    aria-pressed={activePos[pos]}
                    onClick={() => togglePos(pos)}
                  >
                    {POS_LABEL[pos]}
                  </button>
                ))}
              </div>
              <div className="hoeren-script" role="list">
                {lesson.lines.map((line) => {
                  const sentence = line.tokens.map((t) => t.w).join(" ");
                  const active = line.id === activeLineId;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      role="listitem"
                      className={`hoeren-line${active ? " active" : ""}`}
                      ref={(el) => {
                        lineRefs.current[line.id] = el;
                      }}
                      onClick={() => seek(line.t)}
                    >
                      <span className="hoeren-speaker">{line.speaker}</span>
                      <span className="hoeren-words">
                        {line.tokens.map((token, index) => {
                          const colored = activePos[token.pos];
                          const linked =
                            token.link && (linkHover === token.link || selected?.token.link === token.link);
                          const clickable = token.pos !== "other" || Boolean(token.de || token.lemma);
                          const isSelected =
                            selected?.lineId === line.id && selected.index === index;
                          return (
                            <span
                              key={`${line.id}-${index}`}
                              className={[
                                "hoeren-word",
                                colored ? `pos-${token.pos}` : "pos-plain",
                                linked ? "linked" : "",
                                clickable ? "tap" : "",
                                isSelected ? "is-selected" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={(event) => {
                                if (!clickable) return;
                                event.stopPropagation();
                                openToken(line.id, index, token, sentence);
                              }}
                              onMouseEnter={() => token.link && setLinkHover(token.link)}
                              onMouseLeave={() => setLinkHover(null)}
                            >
                              {token.w}
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="hoeren-part card" aria-labelledby="part2">
        <div className="hoeren-part-head">
          <h2 id="part2">Teil 2 · Fragen</h2>
          <p className="muted">
            {score.right}/{score.total} richtig
            {done ? " · ✓ Geschafft (mind. 80 %)" : ""}
          </p>
        </div>
        <ol className="hoeren-questions">
          {lesson.questions.map((q, qi) => {
            const picked = answers[q.id];
            const state = feedback[q.id];
            return (
              <li key={q.id} className="hoeren-q">
                <div className="hoeren-q-top">
                  <p>
                    <span className="hoeren-q-num">{qi + 1}.</span> {q.prompt}
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => seek(q.t)}>
                    Nochmal hören
                  </button>
                </div>
                <div className="hoeren-choices">
                  {q.choices.map((choice, ci) => {
                    const selectedChoice = picked === ci;
                    const showOk = state && ci === q.answer;
                    const showBad = state === "bad" && selectedChoice && ci !== q.answer;
                    return (
                      <button
                        key={choice}
                        type="button"
                        className={[
                          "hoeren-choice",
                          selectedChoice ? "picked" : "",
                          showOk ? "ok" : "",
                          showBad ? "bad" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => answerQuestion(q.id, ci, q.answer)}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
        {Object.keys(answers).length === lesson.questions.length ? (
          <p className={`hoeren-score${done ? " pass" : " fail"}`}>
            Ergebnis: {Math.round(score.pct * 100)} %{done ? " — Lektion geschafft!" : " — Noch einmal versuchen (80 % nötig)."}
          </p>
        ) : null}
      </section>
    </div>
  );
}

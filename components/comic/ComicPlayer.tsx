"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./comic.css";
import { ART } from "@/components/comic/art";
import type { ComicLesson, ComicPanel, GlossEntry } from "@/lib/comic-schema";
import {
  CASE_NAME,
  lemmaOf,
  nounLabel,
  plainComic,
  sayWord,
  tokenizeComic,
} from "@/lib/comic-text";
import { createProgressStore } from "@/lib/storage";
import { lemmaFromGloss } from "@/lib/verbs";
import { SeparableSplit, WortbankSaveButtons } from "@/components/wortbank/SaveButtons";

type ViewId = "comic" | "wortschatz" | "redemittel" | "quiz" | "karten";

const VIEWS: Array<{ id: ViewId; icon: string; label: string }> = [
  { id: "comic", icon: "📖", label: "Comic" },
  { id: "wortschatz", icon: "📚", label: "Wortschatz" },
  { id: "redemittel", icon: "🗣️", label: "Redemittel" },
  { id: "quiz", icon: "✅", label: "Quiz" },
  { id: "karten", icon: "🃏", label: "Karteikarten" },
];

const THEME_ICON: Record<string, string> = {
  Symptome: "🤒",
  Untersuchung: "🩺",
  Medikamente: "💊",
  Kommunikation: "🗣️",
  Diagnose: "❤️‍🩹",
};

const QTYPE: Record<string, string> = {
  pic: "🖼️ Bild → Wort",
  gap: "✍️ Lücke füllen",
  reply: "💬 Die richtige Antwort",
  mc: "🧠 Wissen",
};

type PopInfo = { key: string; surface: string; say?: string; who?: string; source?: string };
type QuizState = {
  i: number;
  res: Record<number, number>;
  tries: Record<number, number>;
  wrong: Record<number, number[]>;
};

function bubbleSide(panel: ComicPanel, who: string): { side: "left" | "right"; tail: number } {
  const figure = panel.chars.find((item) => item.c === who);
  if (who === "oa") return { side: "right", tail: 90 };
  if (figure) {
    return figure.x <= 380
      ? { side: "left", tail: Math.max(24, (figure.x / 720) * 100) }
      : { side: "right", tail: Math.max(24, ((720 - figure.x) / 720) * 100) };
  }
  return { side: ["tom", "becker", "anna"].includes(who) ? "left" : "right", tail: 40 };
}

function GermanText({
  text,
  glossary,
  vocabKeys,
  say,
  who,
  activeKey,
  onWord,
}: {
  text: string;
  glossary: ComicLesson["glossary"];
  vocabKeys: Set<string>;
  say?: string;
  who?: string;
  activeKey?: string | null;
  onWord: (el: HTMLElement, key: string, surface: string, say?: string, who?: string) => void;
}) {
  const tokens = tokenizeComic(text, glossary);
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "text" || !token.key) {
          return <span key={index}>{token.type === "text" ? token.value : token.surface}</span>;
        }
        const key = token.key;
        return (
          <button
            key={index}
            type="button"
            className={`w${vocabKeys.has(key) ? " key" : ""}${activeKey === key ? " active" : ""}`}
            data-k={key}
            onClick={(event) => {
              event.stopPropagation();
              onWord(event.currentTarget, key, token.surface, say, who);
            }}
          >
            {token.surface}
          </button>
        );
      })}
    </>
  );
}

function VocabWord({ entry }: { entry: GlossEntry }) {
  const noun = nounLabel(entry);
  if (!noun) return <>{lemmaOf(entry)}</>;
  return (
    <>
      <span className={`gdot g-${noun.cls}`} />
      <span className={`ar a-${noun.cls}`}>{noun.art}</span> {noun.word}
    </>
  );
}

export function ComicPlayer({ lesson }: { lesson: ComicLesson }) {
  const vocabKeys = useMemo(() => new Set(lesson.vocab.map((item) => item.key)), [lesson]);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const playToken = useRef(0);
  const dirty = useRef(false);
  const viewRef = useRef<ViewId>("comic");
  const segRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const curChRef = useRef(1);

  const [view, setView] = useState<ViewId>("comic");
  const [showEn, setShowEn] = useState(false);
  const [keysOn, setKeysOn] = useState(true);
  const [learned, setLearned] = useState<Record<string, true>>({});
  const [hydrated, setHydrated] = useState(false);
  const [pop, setPop] = useState<PopInfo | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [bubbleEn, setBubbleEn] = useState<Record<string, boolean>>({});
  const [curCh, setCurCh] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [vFilter, setVFilter] = useState<"all" | "new">("all");
  const [vCh, setVCh] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({ i: 0, res: {}, tries: {}, wrong: {} });
  const [feedback, setFeedback] = useState<{ i: number; ok: boolean; text: string } | null>(null);
  const [fc, setFc] = useState({ order: lesson.vocab.map((_, index) => index), i: 0, onlyNew: false, ch: 0 });
  const [flipped, setFlipped] = useState(false);
  const [popLayout, setPopLayout] = useState(0);

  viewRef.current = view;
  const learnedCount = lesson.vocab.filter((item) => learned[item.key]).length;
  const quizPts = Object.values(quiz.res).reduce((sum, value) => sum + value, 0);
  const quizMax = lesson.quiz.length * 2;

  useEffect(() => {
    const saved = createProgressStore().loadComic(lesson.id);
    if (saved?.learned) setLearned(saved.learned);
    setHydrated(true);
  }, [lesson.id]);

  useEffect(() => {
    if (!hydrated || !dirty.current) return;
    const handle = window.setTimeout(() => {
      createProgressStore().saveComic(lesson.id, {
        lessonId: lesson.id,
        learned,
        updatedAt: new Date().toISOString(),
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [learned, hydrated, lesson.id]);

  function markLearned(key: string, value: boolean) {
    dirty.current = true;
    setLearned((current) => {
      const next = { ...current };
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.lang === "de-DE" && /google|natural|premium|enhanced/i.test(voice.name)) ??
      voices.find((voice) => voice.lang === "de-DE") ??
      voices.find((voice) => /^de/i.test(voice.lang)) ??
      null
    );
  }

  function speak(text: string, who?: string, onend?: (ok: boolean) => void) {
    if (!("speechSynthesis" in window)) {
      showToast("Audio is not supported in this browser");
      onend?.(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      text.replace(/–/g, ",").replace(/\bRR\b/g, "R R").replace(/\bi\.v\./g, "i. v."),
    );
    utter.lang = "de-DE";
    const person = who ? lesson.characters[who] : undefined;
    utter.rate = person?.rate ?? 0.9;
    utter.pitch = person?.pitch ?? 1;
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    if (onend) {
      utter.onend = () => onend(true);
      utter.onerror = () => onend(false);
    }
    window.speechSynthesis.speak(utter);
  }

  function stopSpeech() {
    playToken.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }

  function closePop() {
    anchorRef.current = null;
    setPop(null);
  }

  function openPop(el: HTMLElement, key: string, surface: string, say?: string, who?: string) {
    if (anchorRef.current === el) {
      closePop();
      return;
    }
    anchorRef.current = el;
    const source = el.closest("[data-source]")?.getAttribute("data-source") ?? undefined;
    setPop({ key, surface, say, who, source });
  }

  function stickTop() {
    const site = document.querySelector("header.topbar");
    const tabs = rootRef.current?.querySelector(".tabs");
    const bar = rootRef.current?.querySelector(".chapbar");
    return (
      (site?.getBoundingClientRect().height ?? 0) +
      (tabs?.getBoundingClientRect().height ?? 0) +
      (viewRef.current === "comic" ? (bar?.getBoundingClientRect().height ?? 0) : 0)
    );
  }

  function setStickVars() {
    const site = document.querySelector("header.topbar");
    const tabs = rootRef.current?.querySelector(".tabs");
    const siteH = site?.getBoundingClientRect().height ?? 64;
    const tabsH = tabs?.getBoundingClientRect().height ?? 48;
    rootRef.current?.style.setProperty("--tabs-top", `${siteH}px`);
    rootRef.current?.style.setProperty("--cb-top", `${siteH + tabsH}px`);
  }

  function updateChapBar() {
    if (viewRef.current !== "comic") return;
    const root = rootRef.current;
    if (!root) return;
    const line = stickTop() + 40;
    let chapter = 1;
    root.querySelectorAll<HTMLElement>(".chap").forEach((head) => {
      if (head.getBoundingClientRect().top < line) chapter = Number(head.dataset.ch);
    });
    if (chapter !== curChRef.current) {
      curChRef.current = chapter;
      setCurCh(chapter);
    }
    const heads = [...root.querySelectorAll<HTMLElement>(".chap")];
    const comic = root.querySelector(".comic");
    segRefs.current.forEach((seg, index) => {
      if (!seg || !comic) return;
      const fill = seg.querySelector("i");
      if (!(fill instanceof HTMLElement)) return;
      let fraction = index + 1 < chapter ? 1 : 0;
      if (index + 1 === chapter) {
        const start = heads[index]?.getBoundingClientRect().top ?? line;
        const end = heads[index + 1]
          ? heads[index + 1].getBoundingClientRect().top
          : comic.getBoundingClientRect().bottom;
        fraction = Math.min(1, Math.max(0.04, (line - start) / Math.max(1, end - start)));
      }
      fill.style.width = `${fraction * 100}%`;
      seg.classList.toggle("done", index + 1 < chapter);
      seg.classList.toggle("cur", index + 1 === chapter);
    });
  }

  function jumpChapter(n: number, push = true) {
    const clamped = Math.max(1, Math.min(lesson.chapters.length, n));
    setView("comic");
    viewRef.current = "comic";
    window.setTimeout(() => {
      const root = rootRef.current;
      const chapter = lesson.chapters.find((item) => item.n === clamped);
      const el =
        (chapter ? document.getElementById(chapter.id) : null) ??
        root?.querySelector<HTMLElement>(`.chap[data-ch="${clamped}"]`) ??
        null;
      if (!root || !el) return;
      root.querySelectorAll<HTMLElement>(".panel").forEach((panel) => {
        if (Number(panel.dataset.ch) <= clamped) panel.classList.add("in");
      });
      el.classList.add("in");
      const top = el.getBoundingClientRect().top + window.scrollY - stickTop() - 8;
      window.scrollTo({ top, behavior: "smooth" });
      if (push) history.replaceState(null, "", `#ch=${clamped}`);
      curChRef.current = clamped;
      setCurCh(clamped);
    }, 30);
  }

  function goPanel(id: string) {
    setView("comic");
    viewRef.current = "comic";
    window.setTimeout(() => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.add("in");
      const top = panel.getBoundingClientRect().top + window.scrollY - stickTop() - 8;
      window.scrollTo({ top, behavior: "smooth" });
      const art = panel.querySelector(".art-wrap");
      art?.animate(
        [
          { boxShadow: "0 0 0 0 rgba(20,184,166,.0)" },
          { boxShadow: "0 0 0 8px rgba(20,184,166,.5)" },
          { boxShadow: "0 0 0 0 rgba(20,184,166,.0)" },
        ],
        { duration: 1400, delay: 400 },
      );
    }, 30);
  }

  function playPanel(panelEl: HTMLElement) {
    playToken.current += 1;
    const token = playToken.current;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const bubbles = [...panelEl.querySelectorAll<HTMLElement>(".bubble")];
    let index = 0;
    const next = () => {
      if (token !== playToken.current) return;
      setSpeakingId(null);
      if (index >= bubbles.length) return;
      const bubble = bubbles[index];
      index += 1;
      setSpeakingId(bubble.id);
      speak(bubble.dataset.say || "", bubble.dataset.who, () => {
        window.setTimeout(next, 350);
      });
    };
    next();
  }

  function changeView(next: ViewId, push = true) {
    stopSpeech();
    closePop();
    setMenuOpen(false);
    setView(next);
    viewRef.current = next;
    if (push) history.replaceState(null, "", `#view=${next}`);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.add("no-io");
    const nodes = [...root.querySelectorAll<HTMLElement>(".panel, .chap")];
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("in"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const target = entry.target as HTMLElement;
            target.classList.add("in");
            if (target.classList.contains("chap")) {
              const chapterNo = target.dataset.ch;
              root.querySelectorAll<HTMLElement>(`.panel[data-ch="${chapterNo}"]`).forEach((panel) => {
                panel.classList.add("in");
              });
            }
            observer.unobserve(target);
          }
        },
        { threshold: 0, rootMargin: "160px 0px 200px 0px" },
      );
      nodes.forEach((node) => observer.observe(node));
      return () => observer.disconnect();
    }
  }, [lesson.id]);

  useEffect(() => {
    setStickVars();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateChapBar();
        if (pop && anchorRef.current) {
          const moved = Math.abs(window.scrollY - (onScroll as { y?: number }).y!);
          if (Number.isFinite(moved) && moved > 40) closePop();
        }
      });
    };
    (onScroll as { y?: number }).y = window.scrollY;
    const remember = () => {
      (onScroll as { y?: number }).y = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", setStickVars);
    document.addEventListener("click", remember, true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePop();
        stopSpeech();
      }
      if (viewRef.current !== "karten") return;
      const target = event.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      const map: Record<string, string> = {
        " ": "flip",
        ArrowRight: "next",
        ArrowLeft: "prev",
        Enter: "ok",
        s: "say",
        S: "say",
      };
      const action = map[event.key];
      if (action) {
        event.preventDefault();
        fcActRef.current(action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", setStickVars);
      document.removeEventListener("click", remember, true);
      window.removeEventListener("keydown", onKey);
    };
    // Scroll listener is installed once; it reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const popEl = popRef.current;
    const anchor = anchorRef.current;
    if (!pop || !popEl || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = popEl.offsetWidth;
    const height = popEl.offsetHeight;
    const left = Math.min(Math.max(10, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 10);
    let top = rect.bottom + 10;
    if (top + height > window.innerHeight - 10) top = Math.max(110, rect.top - height - 10);
    popEl.style.left = `${left}px`;
    popEl.style.top = `${top}px`;
  }, [pop, learned, popLayout]);

  useEffect(() => {
    function fromHash() {
      const hash = location.hash;
      const viewMatch = /view=(\w+)/.exec(hash);
      if (viewMatch && VIEWS.some((item) => item.id === viewMatch[1])) {
        setView(viewMatch[1] as ViewId);
        return;
      }
      const panelMatch = /^#(p\d+)$/.exec(hash);
      if (panelMatch) {
        setView("comic");
        window.setTimeout(() => goPanel(panelMatch[1]), 40);
        return;
      }
      const chapterMatch = /ch=(\d+)/.exec(hash);
      if (chapterMatch) {
        setView("comic");
        window.setTimeout(() => jumpChapter(Number(chapterMatch[1]), false), 40);
      }
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // Hash routing runs once and calls the latest jump via closure on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const chapter = lesson.chapters[curCh - 1] ?? lesson.chapters[0];
  const popEntry = pop ? lesson.glossary[pop.key] : undefined;

  function answerQuiz(choice: number) {
    const index = quiz.i;
    if (index in quiz.res) return;
    const item = lesson.quiz[index];
    const tries = (quiz.tries[index] ?? 0) + 1;
    if (choice === item.answer) {
      const points = tries === 1 ? 2 : tries === 2 ? 1 : 0;
      setQuiz((current) => ({
        ...current,
        tries: { ...current.tries, [index]: tries },
        res: { ...current.res, [index]: points },
      }));
      setFeedback({ i: index, ok: true, text: item.explain });
      const spoken = item.type === "gap" ? item.q.replace("___", item.options[item.answer]) : item.options[item.answer];
      speak(spoken);
      return;
    }
    const wegen = item.type === "reply" && /wegen einem/.test(item.options[choice]);
    setQuiz((current) => ({
      ...current,
      tries: { ...current.tries, [index]: tries },
      wrong: { ...current.wrong, [index]: [...(current.wrong[index] ?? []), choice] },
    }));
    setFeedback({
      i: index,
      ok: false,
      text: wegen
        ? "Fast! Aber wegen verlangt den Genitiv: wegen eines neuen Patienten."
        : "Nicht ganz – versuch es noch einmal.",
    });
  }

  const fcList = fc.order.filter((index) => {
    const item = lesson.vocab[index];
    if (fc.onlyNew && learned[item.key]) return false;
    if (fc.ch && item.ch !== fc.ch) return false;
    return true;
  });

  function fcAct(action: string) {
    if (action === "onlyNew") {
      setFc((current) => ({ ...current, onlyNew: !current.onlyNew, i: 0 }));
      setFlipped(false);
      return;
    }
    if (action === "shuffle") {
      setFc((current) => ({
        ...current,
        i: 0,
        order: [...current.order].sort(() => Math.random() - 0.5),
      }));
      setFlipped(false);
      showToast("Gemischt");
      return;
    }
    if (!fcList.length) return;
    const safeIndex = fc.i >= fcList.length ? 0 : fc.i;
    const item = lesson.vocab[fcList[safeIndex]];
    const entry = lesson.glossary[item.key];
    if (action === "flip") setFlipped((value) => !value);
    if (action === "say") speak(sayWord(entry, lemmaOf(entry)));
    if (action === "next") {
      setFc((current) => ({ ...current, i: (safeIndex + 1) % fcList.length }));
      setFlipped(false);
    }
    if (action === "prev") {
      setFc((current) => ({ ...current, i: (safeIndex - 1 + fcList.length) % fcList.length }));
      setFlipped(false);
    }
    if (action === "ok") {
      markLearned(item.key, true);
      const noun = nounLabel(entry);
      showToast(`Gelernt: ${noun ? `${noun.art} ${noun.word}` : lemmaOf(entry)}`);
      if (!fc.onlyNew) {
        setFc((current) => ({ ...current, i: (safeIndex + 1) % fcList.length }));
      }
      setFlipped(false);
    }
    if (action === "again") {
      markLearned(item.key, false);
      setFc((current) => ({ ...current, i: (safeIndex + 1) % Math.max(1, fcList.length) }));
      setFlipped(false);
    }
  }
  const fcActRef = useRef(fcAct);
  fcActRef.current = fcAct;

  const bubbleCount = lesson.panels.reduce((sum, panel) => sum + panel.bubbles.length, 0);
  const visibleVocab = lesson.vocab.filter(
    (item) => (vFilter === "all" || !learned[item.key]) && (!vCh || item.ch === vCh),
  );

  return (
    <div
      ref={rootRef}
      className={`ws-root${showEn ? " show-en" : ""}${keysOn ? "" : " no-key"}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".w") && !target.closest(".pop") && !target.closest(".cb-menu-wrap")) {
          closePop();
          setMenuOpen(false);
        }
      }}
    >
      <div className="lesson-bar">
        <div className="lesson-pill">
          <span className="lvl">Wortschatz · {lesson.level}</span>
          <span className="ttl">
            {lesson.title}: {lesson.subtitle}
          </span>
        </div>
        <div className="score-pill" title="Quiz points · words learned">
          <span>⭐ {quizPts}/{quizMax}</span>
          <span className="sep">|</span>
          <span>📚 {learnedCount}/{lesson.vocab.length}</span>
        </div>
      </div>

      <section className="hero" aria-label="Lesson intro">
        <div className="hero-card">
          <div className="hero-txt">
            <span className="kicker">Wortschatz · Comic · {lesson.level}</span>
            <h1>{lesson.title}</h1>
            <p className="sub">{lesson.subtitle}</p>
            <div className="meta">
              <span>{bubbleCount} Sprechblasen</span>
              <span>{lesson.panels.length} Bilder</span>
              <span>{lesson.vocab.length} Schlüsselwörter</span>
              <span>{lesson.chapters.length} Seiten</span>
              <span>ca. 45 Min.</span>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => jumpChapter(1)}>
              Comic lesen ↓
            </button>
            <div className="cast">
              {Object.entries(lesson.characters).map(([id, person]) => (
                <span key={id}>
                  <i style={{ background: person.color }} />
                  {person.name} · {person.role}
                </span>
              ))}
            </div>
            <p className="disc">{lesson.disclaimer}</p>
          </div>
          <div dangerouslySetInnerHTML={{ __html: ART.cast(Object.keys(lesson.characters).slice(0, 3)) }} />
        </div>
      </section>

      <nav className="tabs" role="tablist" aria-label="Lesson sections">
        <div className="tabs-inner">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              className={`tab${view === item.id ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => changeView(item.id)}
            >
              <span className="emoji">{item.icon}</span>
              <span className="lbl">{item.label}</span>
              {item.id === "wortschatz" ? (
                <span className="cnt">
                  {learnedCount}/{lesson.vocab.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        <section className={`view${view === "comic" ? " active" : ""}`} id="view-comic">
          <div className="view-head">
            <div>
              <h2>Der Comic</h2>
              <p>Tippe auf jedes Wort. Unterstrichen = Schlüsselwort.</p>
            </div>
            <div className="ctools">
              <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={showEn} onClick={() => setShowEn((value) => !value)}>
                Übersetzungen
              </button>
              <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={keysOn} onClick={() => setKeysOn((value) => !value)}>
                Schlüsselwörter
              </button>
              <button
                className="btn btn-soft btn-sm"
                type="button"
                onClick={() => {
                  const panels = [...(rootRef.current?.querySelectorAll<HTMLElement>(".panel") ?? [])];
                  const visible = panels.find((panel) => panel.getBoundingClientRect().bottom > 140) ?? panels[0];
                  if (visible) playPanel(visible);
                }}
              >
                Szene vorlesen
              </button>
              <button className="btn btn-ghost btn-sm" type="button" aria-label="Stop audio" onClick={stopSpeech}>
                Stop
              </button>
            </div>
          </div>
          <div className="legend">
            <span><span className="gdot g-der" /><b>der</b></span>
            <span><span className="gdot g-die" /><b>die</b></span>
            <span><span className="gdot g-das" /><b>das</b></span>
            <span>·</span>
            <span className="case c-Nom">Nom</span>
            <span className="case c-Akk">Akk</span>
            <span className="case c-Dat">Dat</span>
            <span className="case c-Gen">Gen</span>
            <span>in the word popups</span>
          </div>
          <div className="chapbar">
            <div className="cb-inner">
              <button className="cb-btn" type="button" aria-label="Vorherige Seite" onClick={() => jumpChapter(curCh - 1)}>
                ‹
              </button>
              <div className="cb-mid">
                <div className="cb-txt">
                  <b>
                    Seite {curCh} von {lesson.chapters.length}
                  </b>{" "}
                  · <span>{chapter.title}</span>
                </div>
                <div className="cb-segs">
                  {lesson.chapters.map((item, index) => (
                    <button
                      key={item.id}
                      ref={(node) => {
                        segRefs.current[index] = node;
                      }}
                      className={`cb-seg${index + 1 === curCh ? " cur" : ""}${index + 1 < curCh ? " done" : ""}`}
                      type="button"
                      title={`Seite ${item.n}: ${item.title}`}
                      onClick={() => jumpChapter(item.n)}
                    >
                      <i />
                    </button>
                  ))}
                </div>
              </div>
              <button className="cb-btn" type="button" aria-label="Nächste Seite" onClick={() => jumpChapter(curCh + 1)}>
                ›
              </button>
              <div className="cb-menu-wrap">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  aria-expanded={menuOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen((open) => !open);
                  }}
                >
                  Kapitel
                </button>
                <div className={`cb-menu${menuOpen ? " open" : ""}`} role="menu">
                  {lesson.chapters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={item.n === curCh ? "cur" : ""}
                      onClick={() => {
                        setMenuOpen(false);
                        jumpChapter(item.n);
                      }}
                    >
                      <span className="emoji">{item.emoji}</span>
                      <span>
                        <b>Seite {item.n}</b> · {item.title}
                        <small>{item.time} Uhr</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="comic">
            {lesson.panels.map((panel, index) => {
              const showHead = index === 0 || lesson.panels[index - 1].ch !== panel.ch;
              const chapterInfo = lesson.chapters[panel.ch - 1];
              const first = lesson.panels.findIndex((item) => item.ch === panel.ch) + 1;
              const count = lesson.panels.filter((item) => item.ch === panel.ch).length;
              const words = lesson.vocab.filter((item) => item.ch === panel.ch);
              let previous: string | null = null;
              return (
                <div key={panel.id}>
                  {showHead && chapterInfo ? (
                    <section className="chap" id={chapterInfo.id} data-ch={chapterInfo.n} data-source={chapterInfo.id}>
                      <div className="chap-top">
                        <span className="chap-n">
                          Seite {chapterInfo.n} von {lesson.chapters.length}
                        </span>
                        <span className="chap-time">
                          {chapterInfo.time} Uhr · Bild {first}–{first + count - 1}
                        </span>
                      </div>
                      <div className="chap-main">
                        <div className="chap-emoji emoji">{chapterInfo.emoji}</div>
                        <div>
                          <h3>{chapterInfo.title}</h3>
                          <div className="chap-en">{chapterInfo.en}</div>
                        </div>
                      </div>
                      <p className="chap-sum">
                        <GermanText text={chapterInfo.summary} glossary={lesson.glossary} vocabKeys={vocabKeys} activeKey={pop?.key} onWord={openPop} />
                      </p>
                      <div className="chap-goals">
                        <b>Du lernst:</b>
                        <ul>
                          {chapterInfo.goals.map((goal) => (
                            <li key={goal}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                      {chapterInfo.examTip ? (
                        <aside className="exam-tip">
                          <b>Prüfungstipp · mündliche B2-Prüfung</b>
                          <p>{chapterInfo.examTip}</p>
                        </aside>
                      ) : null}
                      <div className="chap-words">
                        <b>Schlüsselwörter:</b>
                        {words.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className="w key chip"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPop(event.currentTarget, item.key, lesson.glossary[item.key]?.de ?? item.key);
                            }}
                          >
                            <VocabWord entry={lesson.glossary[item.key]} />
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section className="panel" id={panel.id} data-ch={panel.ch} data-source={panel.id}>
                    <div className="art-wrap">
                      {panel.caption ? (
                        <div className="caption">
                          <GermanText text={panel.caption} glossary={lesson.glossary} vocabKeys={vocabKeys} activeKey={pop?.key} onWord={openPop} />
                        </div>
                      ) : null}
                      <div className="pnum">
                        <span className="n">
                          {index + 1} / {lesson.panels.length}
                        </span>
                        <button className="play" type="button" onClick={(event) => playPanel(event.currentTarget.closest(".panel") as HTMLElement)}>
                          Szene
                        </button>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: ART.panel(panel, index) }} />
                    </div>
                    <div className="bubbles">
                      {panel.bubbles.map((bubble, bubbleIndex) => {
                        const side = bubbleSide(panel, bubble.who);
                        const person = lesson.characters[bubble.who];
                        const continued = previous === bubble.who;
                        previous = bubble.who;
                        const bubbleId = `${panel.id}b${bubbleIndex + 1}`;
                        const said = plainComic(bubble.de);
                        return (
                          <div
                            key={bubbleId}
                            id={bubbleId}
                            className={`bubble ${side.side}${bubble.who === "oa" ? " phone" : ""}${continued ? " cont" : ""}${speakingId === bubbleId ? " speaking" : ""}${bubbleEn[bubbleId] ? " en-on" : ""}`}
                            style={{ ["--tail" as string]: `${side.tail.toFixed(1)}%` }}
                            data-say={said}
                            data-who={bubble.who}
                          >
                            <div className="b-head">
                              <span className="av" dangerouslySetInnerHTML={{ __html: ART.avatar(bubble.who) }} />
                              <span className="nm" style={{ color: person?.color }}>{person?.name}</span>
                              <span className="sp" />
                              <button
                                className="b-btn"
                                type="button"
                                aria-label="Play audio"
                                onClick={() => {
                                  stopSpeech();
                                  setSpeakingId(bubbleId);
                                  speak(said, bubble.who, () => setSpeakingId(null));
                                }}
                              >
                                Wort
                              </button>
                              <button
                                className="b-btn"
                                type="button"
                                aria-pressed={Boolean(bubbleEn[bubbleId])}
                                onClick={() => setBubbleEn((current) => ({ ...current, [bubbleId]: !current[bubbleId] }))}
                              >
                                EN
                              </button>
                            </div>
                            <p className="de">
                              <GermanText
                                text={bubble.de}
                                glossary={lesson.glossary}
                                vocabKeys={vocabKeys}
                                say={said}
                                who={bubble.who}
                                activeKey={pop?.key} onWord={openPop}
                              />
                            </p>
                            <p className="en">{bubble.en}</p>
                          </div>
                        );
                      })}
                    </div>
                    {panel.tip ? (
                      <details className="tip">
                        <summary>Tipp zur Szene</summary>
                        <p dangerouslySetInnerHTML={{ __html: panel.tip }} />
                      </details>
                    ) : null}
                  </section>
                </div>
              );
            })}
            {lesson.cheatsheet ? (
              <section className="sheet" id="spickzettel" aria-label="Ablauf-Spickzettel">
                <div className="sheet-head">
                  <div>
                    <h3>{lesson.cheatsheet.title}</h3>
                    <p>{lesson.cheatsheet.intro}</p>
                  </div>
                  <button className="btn btn-primary no-print" type="button" onClick={() => window.print()}>
                    Drucken
                  </button>
                </div>
                <ol>
                  {lesson.cheatsheet.steps.map((step) => (
                    <li key={step.n}>
                      <b>
                        {step.n}. {step.title}
                      </b>
                      <ul>
                        {step.phrases.map((phrase) => (
                          <li key={phrase}>{phrase}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <p className="disc2">{lesson.disclaimer}</p>
              </section>
            ) : null}
            <div className="comic-end">
              <div className="emoji" style={{ fontSize: 40 }}>🎉</div>
              <h3>Ende des Kapitels!</h3>
              <p>{lesson.closing ?? "Herr Becker ist in guten Händen. Jetzt lernst du die wichtigsten Wörter."}</p>
              <p className="disc2">{lesson.disclaimer}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn btn-primary" type="button" onClick={() => changeView("wortschatz")}>
                  Zum Wortschatz
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => changeView("quiz")}>
                  Quiz starten
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={`view${view === "wortschatz" ? " active" : ""}`}>
          <div className="view-head">
            <div>
              <h2>Wortschatz</h2>
              <p>
                {learnedCount} von {lesson.vocab.length} gelernt
              </p>
            </div>
            <div className="filters">
              <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={vFilter === "all"} onClick={() => setVFilter("all")}>
                Alle
              </button>
              <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={vFilter === "new"} onClick={() => setVFilter("new")}>
                Noch nicht gelernt
              </button>
              <button className="btn btn-soft btn-sm" type="button" onClick={() => changeView("karten")}>
                Als Karteikarten üben
              </button>
            </div>
          </div>
          <div className="filters chfilters">
            <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={vCh === 0} onClick={() => setVCh(0)}>
              Alle Seiten
            </button>
            {lesson.chapters.map((item) => (
              <button
                key={item.id}
                className="btn btn-ghost btn-sm toggle"
                type="button"
                aria-pressed={vCh === item.n}
                title={item.title}
                onClick={() => setVCh(item.n)}
              >
                <span className="emoji">{item.emoji}</span> {item.n}
              </button>
            ))}
          </div>
          <div className="vprog" aria-hidden="true">
            <i style={{ width: `${(learnedCount / lesson.vocab.length) * 100}%` }} />
          </div>
          {lesson.chapters.map((item) => {
            const rows = visibleVocab.filter((vocab) => vocab.ch === item.n);
            if (!rows.length) return null;
            return (
              <div className="theme" key={item.id}>
                <h3>
                  <span className="emoji">{item.emoji}</span>
                  Seite {item.n}: {item.title} <small>{rows.length} Wörter</small>
                </h3>
                <div className="vgrid">
                  {rows.map((vocab) => {
                    const entry = lesson.glossary[vocab.key];
                    const noun = nounLabel(entry);
                    const panelNumber = lesson.panels.findIndex((panel) => panel.id === vocab.panel) + 1;
                    const said = noun ? `${noun.art.split("/")[0]} ${noun.word}` : lemmaOf(entry);
                    return (
                      <article key={vocab.key} className={`vcard${learned[vocab.key] ? " learned" : ""}`}>
                        <div className="ve emoji">{entry.emoji}</div>
                        <div>
                          <span className="vth">
                            {THEME_ICON[vocab.theme] || ""} {vocab.theme}
                          </span>
                          <div className="vw">
                            <VocabWord entry={entry} />
                          </div>
                          <div className="vpl">{noun ? (entry.plOnly ? "nur Plural" : entry.pl === "kein Plural" ? "kein Plural" : `Pl.: ${entry.pl || "–"}`) : entry.pos}</div>
                          <div className="ven">{entry.en}</div>
                        </div>
                        <div className="vact">
                          <button className="b-btn" type="button" aria-label="Play word" onClick={() => speak(said)}>
                            Hören
                          </button>
                          <label className="chk">
                            <input
                              type="checkbox"
                              checked={Boolean(learned[vocab.key])}
                              onChange={(event) => markLearned(vocab.key, event.target.checked)}
                            />
                            gelernt
                          </label>
                        </div>
                        <div className="vex">
                          <span className="emoji">💬</span>
                          <span className="q">
                            „
                            <GermanText
                              text={vocab.example}
                              glossary={lesson.glossary}
                              vocabKeys={vocabKeys}
                              say={plainComic(vocab.example)}
                              activeKey={pop?.key} onWord={openPop}
                            />
                            “
                          </span>
                          <button className="b-btn" type="button" aria-label="Play example" onClick={() => speak(plainComic(vocab.example))}>
                            Hören
                          </button>
                          <button className="b-btn" type="button" onClick={() => goPanel(vocab.panel)}>
                            Bild {panelNumber}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!visibleVocab.length ? (
            <div className="fc-empty">
              Alle Wörter gelernt!{" "}
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setVFilter("all")}>
                Alle zeigen
              </button>
            </div>
          ) : null}
        </section>

        <section className={`view${view === "redemittel" ? " active" : ""}`}>
          <div className="view-head">
            <div>
              <h2>Redemittel</h2>
              <p>Useful phrases from the comic. Tap play and repeat them out loud.</p>
            </div>
          </div>
          <div className="rm-tipbox">
            <b>du oder Sie?</b> Kolleg:innen auf Station duzen sich oft („Ich übergebe <b>dir</b> …“). Mit Patient:innen und meist mit dem Oberarzt: immer <b>Sie</b> („Ich übergebe <b>Ihnen</b> …“).
          </div>
          {lesson.redemittel.map((group) => (
            <div className="rm-group" key={`${group.ch}-${group.group}`}>
              <h3>
                <span className="emoji">{group.icon}</span>
                <span className="rm-s">Seite {group.ch}</span>
                {group.group}
              </h3>
              {group.items.map((item) => {
                const panelNumber = item.panel ? lesson.panels.findIndex((panel) => panel.id === item.panel) + 1 : 0;
                return (
                  <div className="rm-row" key={item.de}>
                    <button className="b-btn" type="button" aria-label="Play" onClick={() => speak(plainComic(item.de))}>
                      Hören
                    </button>
                    <div>
                      <div className="de2">
                        <GermanText text={item.de} glossary={lesson.glossary} vocabKeys={vocabKeys} say={plainComic(item.de)} activeKey={pop?.key} onWord={openPop} />
                        {item.panel ? null : <span className="formal">Sie-Form</span>}
                      </div>
                      <div className="en2">{item.en}</div>
                    </div>
                    {panelNumber ? (
                      <button className="b-btn" type="button" onClick={() => goPanel(item.panel || "")}>
                        Bild {panelNumber}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        <section className={`view${view === "quiz" ? " active" : ""}`}>
          <div className="view-head">
            <div>
              <h2>Quiz</h2>
              <p>
                {lesson.quiz.length} Fragen – mindestens eine pro Seite. 2 Punkte beim ersten Versuch, 1 Punkt beim zweiten.
              </p>
            </div>
          </div>
          <QuizBlock
            lesson={lesson}
            quiz={quiz}
            feedback={feedback}
            onAnswer={answerQuiz}
            onNext={() => {
              setFeedback(null);
              setQuiz((current) => ({ ...current, i: current.i + 1 }));
            }}
            onAgain={() => {
              setFeedback(null);
              setQuiz({ i: 0, res: {}, tries: {}, wrong: {} });
            }}
            onCards={() => changeView("karten")}
            onPanel={goPanel}
          />
        </section>

        <section className={`view${view === "karten" ? " active" : ""}`}>
          <div className="fc-top">
            <div>
              <h2 style={{ margin: 0, color: "var(--navy)" }}>Karteikarten</h2>
              <span className="fc-count">{fcList.length ? `Karte ${Math.min(fc.i, fcList.length - 1) + 1} von ${fcList.length}` : "0 Karten"}</span>
            </div>
            <div className="filters">
              <select
                className="sel"
                aria-label="Seite wählen"
                value={fc.ch}
                onChange={(event) => {
                  setFc((current) => ({ ...current, ch: Number(event.target.value), i: 0 }));
                  setFlipped(false);
                }}
              >
                <option value={0}>Alle Seiten ({lesson.vocab.length})</option>
                {lesson.chapters.map((item) => (
                  <option key={item.id} value={item.n}>
                    Seite {item.n}: {item.title} ({lesson.vocab.filter((vocab) => vocab.ch === item.n).length})
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => fcAct("shuffle")}>
                Mischen
              </button>
              <button className="btn btn-ghost btn-sm toggle" type="button" aria-pressed={fc.onlyNew} onClick={() => fcAct("onlyNew")}>
                Nur nicht gelernte
              </button>
            </div>
          </div>
          {!fcList.length ? (
            <div className="fc-empty">
              <p><b>Alle Karten gelernt!</b></p>
              <button className="btn btn-ghost" type="button" onClick={() => fcAct("onlyNew")}>
                Alle Karten zeigen
              </button>
            </div>
          ) : (
            <Flashcard
              lesson={lesson}
              item={lesson.vocab[fcList[Math.min(fc.i, fcList.length - 1)]]}
              learned={Boolean(learned[lesson.vocab[fcList[Math.min(fc.i, fcList.length - 1)]].key])}
              flipped={flipped}
              onFlip={() => fcAct("flip")}
              onAct={fcAct}
            />
          )}
        </section>
      </main>
      <footer className="foot">
        MediDeutsch · Wortschatz-Comic · Audio via your browser&apos;s German voice (speechSynthesis, de-DE) · {lesson.disclaimer}
      </footer>
      {pop && popEntry ? (
        <WordPop
          refEl={popRef}
          entry={popEntry}
          surface={pop.surface}
          learned={Boolean(learned[pop.key])}
          isKey={vocabKeys.has(pop.key)}
          say={pop.say}
          who={pop.who}
          onClose={closePop}
          onSpeak={speak}
          onLearn={() => markLearned(pop.key, !learned[pop.key])}
          draft={{
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonKind: "comic",
            key: pop.key,
            surface: pop.surface,
            lemma: lemmaFromGloss(popEntry.de, popEntry.pos),
            pos: popEntry.pos,
            de: comicHead(popEntry),
            en: popEntry.en,
            emoji: popEntry.emoji || "🔤",
            sentence: pop.say ?? "",
            href: `/wortschatz/${lesson.id}${pop.source ? `#${pop.source}` : ""}`,
          }}
          onLayout={() => setPopLayout((value) => value + 1)}
        />
      ) : null}
      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

function comicHead(entry: GlossEntry): string {
  const noun = nounLabel(entry);
  if (noun) return `${noun.art.split("/")[0]} ${noun.word}`;
  const lemma = lemmaFromGloss(entry.de, entry.pos);
  return /^verb/i.test(entry.pos) ? lemma : entry.de.split("→")[0].trim();
}

function WordPop({
  refEl,
  entry,
  surface,
  learned,
  isKey,
  say,
  who,
  onClose,
  onSpeak,
  onLearn,
  draft,
  onLayout,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  entry: GlossEntry;
  surface: string;
  learned: boolean;
  isKey: boolean;
  say?: string;
  who?: string;
  onClose: () => void;
  onSpeak: (text: string, who?: string) => void;
  onLearn: () => void;
  draft: {
    lessonId: string;
    lessonTitle: string;
    lessonKind: "comic";
    key: string;
    surface: string;
    lemma: string;
    pos: string;
    de: string;
    en: string;
    emoji: string;
    sentence: string;
    href: string;
  };
  onLayout: () => void;
}) {
  const noun = nounLabel(entry);
  const head = noun ? (
    <>
      <span className={`art a-${noun.cls}`}>
        <span className={`gdot g-${noun.cls}`} />
        {noun.art}
        {noun.note ? " (Pl.)" : ""}
      </span>
      {noun.word}
    </>
  ) : (
    /name|title|noun|abbreviation/.test(entry.pos) ? surface : surface.toLowerCase()
  );
  return (
    <div className="pop open" role="dialog" ref={refEl}>
      <button className="close" type="button" aria-label="Close" onClick={onClose}>
        ✕
      </button>
      <div className="pop-head">
        <div className="pic emoji">{entry.emoji || "🔤"}</div>
        <div>
          <div className="word">{head}</div>
          <span className="pos">{entry.pos}</span>
          {isKey ? <span className="pos keyb">Key word</span> : null}
        </div>
      </div>
      <div className="en1">{entry.en}</div>
      {noun && entry.pl && !entry.plOnly ? (
        <div className="pl">{entry.pl === "kein Plural" ? "kein Plural" : <>Plural: <b>{entry.pl}</b></>}</div>
      ) : null}
      {!noun && entry.de && entry.de.toLowerCase() !== surface.toLowerCase() ? (
        <div className="pl">Dictionary form: <b>{entry.de}</b></div>
      ) : null}
      <div>
        {entry.gov === "Wechsel" ? (
          <>
            <span className="case c-Akk">wohin? + Akk</span>
            <span className="case c-Dat">wo? + Dat</span>
          </>
        ) : entry.gov ? (
          <span className={`case c-${entry.gov}`}>{entry.de} + {CASE_NAME[entry.gov] || entry.gov}</span>
        ) : entry.case ? (
          <span className={`case c-${entry.case}`}>{CASE_NAME[entry.case] || entry.case}</span>
        ) : null}
      </div>
      {entry.note ? <div className="note">{entry.note}</div> : null}
      <SeparableSplit lemma={draft.lemma} />
      <div className="actions">
        <button className="btn btn-soft btn-sm" type="button" onClick={() => onSpeak(sayWord(entry, surface))}>
          Word
        </button>
        {say ? (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => onSpeak(say, who)}>
            Sentence
          </button>
        ) : null}
        {isKey ? (
          <button className="btn btn-ghost btn-sm" type="button" onClick={onLearn}>
            {learned ? "Learned" : "Mark learned"}
          </button>
        ) : null}
        <WortbankSaveButtons draft={draft} onChange={onLayout} />
      </div>
    </div>
  );
}

function QuizBlock({
  lesson,
  quiz,
  feedback,
  onAnswer,
  onNext,
  onAgain,
  onCards,
  onPanel,
}: {
  lesson: ComicLesson;
  quiz: QuizState;
  feedback: { i: number; ok: boolean; text: string } | null;
  onAnswer: (choice: number) => void;
  onNext: () => void;
  onAgain: () => void;
  onCards: () => void;
  onPanel: (id: string) => void;
}) {
  const max = lesson.quiz.length * 2;
  const points = Object.values(quiz.res).reduce((sum, value) => sum + value, 0);
  const bar = (
    <div className="qbar">
      {lesson.quiz.map((_, index) => {
        const score = quiz.res[index];
        const cls = score === 2 ? "ok" : score === 1 ? "half" : score === 0 ? "bad" : index === quiz.i ? "cur" : "";
        return <i key={index} className={cls} />;
      })}
    </div>
  );
  if (quiz.i >= lesson.quiz.length) {
    const ratio = points / max;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
    const message =
      stars === 3
        ? "Ausgezeichnet! Du kannst die Redemittel im Gespräch nutzen."
        : stars === 2
          ? "Sehr gut! Wiederhole die Karteikarten."
          : "Weiter üben – lies den Comic noch einmal.";
    return (
      <div className="qwrap">
        {bar}
        <div className="qcard qres">
          <div className="big emoji">
            {[0, 1, 2].map((star) => (
              <span key={star} className={star < stars ? "" : "off"}>⭐</span>
            ))}
          </div>
          <div className="qq">
            {points} von {max} Punkten
          </div>
          <p>{message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="button" onClick={onAgain}>
              Nochmal
            </button>
            <button className="btn btn-ghost" type="button" onClick={onCards}>
              Karteikarten
            </button>
          </div>
        </div>
      </div>
    );
  }
  const item = lesson.quiz[quiz.i];
  const done = quiz.i in quiz.res;
  const chapter = lesson.chapters[item.ch - 1];
  const note = feedback && feedback.i === quiz.i ? feedback : done ? { i: quiz.i, ok: true, text: item.explain } : null;
  return (
    <div className="qwrap">
      {bar}
      <div className="qcard">
        <div className="qtype">
          {QTYPE[item.type]} · Frage {quiz.i + 1} von {lesson.quiz.length}{" "}
          <span className="qch">
            {chapter?.emoji} Seite {item.ch}: {chapter?.title}
          </span>
        </div>
        <div className="qq">{item.type === "gap" ? "Ergänze den Satz aus dem Comic." : item.q}</div>
        <div className="qen">{item.en}</div>
        {item.type === "pic" && item.pic && (ART.quizPic as Record<string, string>)[item.pic] ? (
          <div className="qpic" dangerouslySetInnerHTML={{ __html: (ART.quizPic as Record<string, string>)[item.pic] }} />
        ) : null}
        {item.type === "gap" ? (
          <div className="gapline">
            {item.q.split("___")[0]}
            <span className={`blank${done ? " filled" : ""}`}>{done ? item.options[item.answer] : "?"}</span>
            {item.q.split("___")[1]}
          </div>
        ) : null}
        {item.type === "reply" && item.ctx ? (
          <div className="ctx">
            {item.ctx.map((line) => (
              <div className="cl" key={line.de}>
                <span className="av" dangerouslySetInnerHTML={{ __html: ART.avatar(line.who) }} />
                <div>
                  <div className="cn" style={{ color: lesson.characters[line.who]?.color }}>
                    {line.who === "oa" ? "📞 " : ""}
                    {lesson.characters[line.who]?.name}
                  </div>
                  <div className="cb">{line.de}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className={`qopts${item.type === "reply" || item.type === "mc" ? " col" : ""}`}>
          {item.options.map((option, index) => {
            const missed = quiz.wrong[quiz.i]?.includes(index);
            return (
              <button
                key={option}
                className={`qopt${done && index === item.answer ? " right" : ""}${missed ? " wrong" : ""}`}
                type="button"
                disabled={done || missed}
                onClick={() => onAnswer(index)}
              >
                {option}
              </button>
            );
          })}
        </div>
        {note ? <div className={`qfb show ${note.ok ? "ok" : "bad"}`}>{note.ok ? `Richtig! ${note.text}` : note.text}</div> : <div className="qfb" />}
        <div className="qnav">
          <span className="qen" style={{ margin: 0 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => onPanel(item.panel)}>
              Im Comic nachsehen
            </button>
          </span>
          <button className="btn btn-primary" type="button" disabled={!done} onClick={onNext}>
            {quiz.i === lesson.quiz.length - 1 ? "Ergebnis" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Flashcard({
  lesson,
  item,
  learned,
  flipped,
  onFlip,
  onAct,
}: {
  lesson: ComicLesson;
  item: ComicLesson["vocab"][number];
  learned: boolean;
  flipped: boolean;
  onFlip: () => void;
  onAct: (action: string) => void;
}) {
  const entry = lesson.glossary[item.key];
  const noun = nounLabel(entry);
  return (
    <>
      <div className="fc-stage">
        <div className={`fc${flipped ? " flipped" : ""}`} role="button" tabIndex={0} aria-label="Flip card" onClick={onFlip}>
          <div className={`fc-face fc-front b-${noun ? (noun.cls === "pl" ? "none" : noun.cls) : "none"}`}>
            <span className="fth">
              Seite {item.ch} · {item.theme}
            </span>
            {learned ? <span className="flr">gelernt</span> : null}
            <div className="fe emoji">{entry.emoji}</div>
            <div className="fw">
              <VocabWord entry={entry} />
            </div>
            <div className="fhint">Tippen zum Umdrehen</div>
          </div>
          <div className="fc-face fc-back">
            <div className="fen">{entry.en}</div>
            <div className="fpl">{noun ? (entry.plOnly ? "nur Plural" : entry.pl === "kein Plural" ? "kein Plural" : `Pl.: ${entry.pl || "–"}`) : entry.pos}</div>
            <div className="fex">„{plainComic(item.example)}“</div>
            <div className="fhint">Tippen zum Umdrehen</div>
          </div>
        </div>
      </div>
      <div className="fc-ctrl">
        <button className="btn btn-ghost" type="button" aria-label="Previous" onClick={() => onAct("prev")}>←</button>
        <button className="btn btn-soft" type="button" onClick={() => onAct("say")}>Hören</button>
        <button className="btn btn-ghost" type="button" onClick={() => onAct("flip")}>Umdrehen</button>
        <button className="btn btn-again" type="button" onClick={() => onAct("again")}>Nochmal</button>
        <button className="btn btn-ok" type="button" onClick={() => onAct("ok")}>Gelernt</button>
        <button className="btn btn-ghost" type="button" aria-label="Next" onClick={() => onAct("next")}>→</button>
      </div>
      <div className="kbd">
        <kbd>Leertaste</kbd> umdrehen · <kbd>←</kbd> <kbd>→</kbd> blättern · <kbd>Enter</kbd> gelernt · <kbd>S</kbd> hören
      </div>
    </>
  );
}

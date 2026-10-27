"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Lesson } from "@/lib/lesson-schema";
import {
  scoreSections,
  sectionPoints,
  starsFor,
  totalPoints,
  type ScoreSection,
} from "@/lib/scoring";
import {
  createProgressStore,
  emptyProgress,
  type SavedProgress,
} from "@/lib/storage";
import { useSpeech } from "@/lib/audio";
import { lernkontrolleStep, masteryRatio, MASTERY_RATIO } from "@/lib/practice";

type Float = { id: number; n: number; x: number; y: number };

type PopState = {
  key: string;
  surface: string;
  sentence?: string;
  x: number;
  y: number;
} | null;

type LessonApi = {
  lesson: Lesson;
  progress: SavedProgress;
  patch: (recipe: (current: SavedProgress) => SavedProgress) => void;
  award: (key: string, points: number, anchor?: HTMLElement | null) => void;
  markSeen: (key: string, anchor?: HTMLElement | null, explore?: boolean) => void;
  total: number;
  max: number;
  stars: 0 | 1 | 2 | 3;
  sections: ScoreSection[];
  sectionScore: (key: string) => number;
  speak: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  toast: (message: string) => void;
  pop: PopState;
  openPop: (key: string, anchor: HTMLElement, sentence?: string) => void;
  closePop: () => void;
  reset: () => void;
  ready: boolean;
};

const Ctx = createContext<LessonApi | null>(null);

export function useLesson(): LessonApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLesson must be used inside LessonProvider");
  return ctx;
}

export function LessonProvider({
  lesson,
  initialStep,
  children,
}: {
  lesson: Lesson;
  initialStep: number | null;
  children: React.ReactNode;
}) {
  const speech = useSpeech();
  const store = useMemo(() => createProgressStore(), []);
  const [progress, setProgress] = useState<SavedProgress>(() => emptyProgress(lesson.id));
  const [hydrated, setHydrated] = useState(false);
  const booted = useRef(false);
  const dirty = useRef(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [pop, setPop] = useState<PopState>(null);
  const floatId = useRef(0);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const saved = store.load(lesson.id);
    const base = saved ?? emptyProgress(lesson.id);
    const fromUrl = new URLSearchParams(window.location.search).get("step");
    const parsed = fromUrl === null || fromUrl === "" ? null : Number(fromUrl);
    const step = initialStep !== null && Number.isFinite(initialStep) ? initialStep : parsed;
    if (step !== null && Number.isFinite(step)) {
      base.stepIndex = Math.max(0, Math.min(lesson.steps.length - 1, step));
    }
    setProgress(base);
    setHydrated(true);
  }, [lesson.id, initialStep, lesson.steps.length, store]);

  useEffect(() => {
    if (!hydrated || !dirty.current) return;
    const handle = window.setTimeout(() => store.save(lesson.id, progress), 400);
    return () => window.clearTimeout(handle);
  }, [progress, hydrated, lesson.id, store]);

  useEffect(() => {
    if (!hydrated || progress.completedAt) return;
    const test = lernkontrolleStep(lesson);
    if (!test) return;
    if (masteryRatio(progress.mc, test.id, test.quiz.length) < MASTERY_RATIO) return;
    dirty.current = true;
    setProgress((current) =>
      current.completedAt
        ? current
        : { ...current, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    );
  }, [hydrated, lesson, progress.mc, progress.completedAt]);

  const sections = useMemo(
    () => scoreSections(lesson.steps, lesson.scoring),
    [lesson],
  );
  const max = sections.reduce((sum, section) => sum + section.max, 0);
  const total = Math.max(0, totalPoints(progress.pts));
  const stars = starsFor(max ? total / max : 0, lesson.scoring.stars);

  const patch = useCallback((recipe: (current: SavedProgress) => SavedProgress) => {
    dirty.current = true;
    setProgress((current) => recipe(current));
  }, []);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.setTimeout(() => setToastMsg((cur) => (cur === message ? null : cur)), 2200);
  }, []);

  const award = useCallback(
    (key: string, points: number, anchor?: HTMLElement | null) => {
      dirty.current = true;
      setProgress((current) => {
        if (key in current.pts) return current;
        if (points > 0 && anchor) {
          const rect = anchor.getBoundingClientRect();
          const id = ++floatId.current;
          const next = { id, n: points, x: rect.left + rect.width / 2, y: rect.top };
          setFloats((list) => [...list, next]);
          window.setTimeout(() => setFloats((list) => list.filter((item) => item.id !== id)), 1000);
        }
        if (points === 0) toast("Correct — 0 points left on this item (hint and retry).");
        return {
          ...current,
          pts: { ...current.pts, [key]: points },
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [toast],
  );

  const markSeen = useCallback(
    (key: string, anchor?: HTMLElement | null, explore?: boolean) => {
      dirty.current = true;
      setProgress((current) => {
        const seen = current.seen[key] ? current.seen : { ...current.seen, [key]: true as const };
        if (!explore) return { ...current, seen };
        const count = Object.keys(current.pts).filter((k) => k.startsWith("w:")).length;
        if (current.pts[`w:${key}`] || count >= lesson.scoring.wordExplorePoints) {
          return { ...current, seen };
        }
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          const id = ++floatId.current;
          const next = { id, n: 1, x: rect.left + rect.width / 2, y: rect.top };
          setFloats((list) => [...list, next]);
          window.setTimeout(() => setFloats((list) => list.filter((item) => item.id !== id)), 1000);
        }
        return {
          ...current,
          seen,
          pts: { ...current.pts, [`w:${key}`]: 1 },
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [lesson.scoring.wordExplorePoints],
  );

  const openPop = useCallback((key: string, anchor: HTMLElement, sentence?: string) => {
    const rect = anchor.getBoundingClientRect();
    setPop({
      key,
      surface: anchor.textContent ?? key,
      sentence,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  }, []);

  const closePop = useCallback(() => setPop(null), []);

  const reset = useCallback(() => {
    dirty.current = true;
    store.clear(lesson.id);
    setProgress(emptyProgress(lesson.id));
    speech.cancel();
  }, [lesson.id, speech, store]);

  const api: LessonApi = {
    lesson,
    progress,
    patch,
    award,
    markSeen,
    total,
    max,
    stars,
    sections,
    sectionScore: (key) => sectionPoints(progress.pts, key),
    speak: (text) => speech.speak(text),
    cancelSpeech: () => speech.cancel(),
    toast,
    pop,
    openPop,
    closePop,
    reset,
    ready: hydrated,
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className={`toast${toastMsg ? " show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
      {floats.map((item) => (
        <div key={item.id} className="plus" style={{ left: item.x, top: item.y }}>
          +{item.n} ⭐
        </div>
      ))}
    </Ctx.Provider>
  );
}

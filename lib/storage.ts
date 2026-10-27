import { isWortbankDoc, type WortbankDoc } from "@/lib/wortbank";

/**
 * Progress storage. Guests use localStorage. A Supabase adapter can replace
 * this later without touching the lesson player — see docs/SUPABASE.md.
 */
export type SavedProgress = {
  lessonId: string;
  stepIndex: number;
  pts: Record<string, number>;
  seen: Record<string, true>;
  hints: Record<string, true>;
  mc: Record<string, { wrong: number[]; solved: boolean }>;
  tips: Record<string, true>;
  gapDone: Record<string, true>;
  gapTries: Record<string, number>;
  lines: Record<string, number[]>;
  built: Record<string, true>;
  buildTries: Record<string, number>;
  matched: Record<string, true>;
  matchTries: Record<string, number>;
  marks: Record<string, string>;
  coloured: Record<string, true>;
  colourTries: Record<string, number>;
  pen: string;
  showEn: boolean;
  showCases: boolean;
  highlight: boolean;
  anim: Record<string, number>;
  writing: Record<string, { text: string; awarded: Record<string, number>; tries: number }>;
  solved: Record<string, true>;
  wrong: Record<string, number[]>;
  updatedAt: string;
  completedAt?: string;
};

/** Wortschatz "gelernt" marks. Kept beside grammar scores, same store. */
export type ComicProgress = {
  lessonId: string;
  learned: Record<string, true>;
  updatedAt: string;
};

export interface ProgressStore {
  load(lessonId: string): SavedProgress | null;
  save(lessonId: string, data: SavedProgress): void;
  list(): SavedProgress[];
  clear(lessonId: string): void;
  loadComic(lessonId: string): ComicProgress | null;
  saveComic(lessonId: string, data: ComicProgress): void;
  loadWortbank(): WortbankDoc | null;
  saveWortbank(data: WortbankDoc): void;
}

const INDEX = "medideutsch:v1:index";
const keyFor = (id: string) => `medideutsch:v1:${id}`;
const comicKeyFor = (id: string) => `medideutsch:v1:comic:${id}`;
const WORTBANK_KEY = "medideutsch:v1:wortbank";

export class LocalProgressStore implements ProgressStore {
  load(lessonId: string): SavedProgress | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(keyFor(lessonId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedProgress;
    } catch {
      return null;
    }
  }

  save(lessonId: string, data: SavedProgress): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(keyFor(lessonId), JSON.stringify(data));
    const ids = new Set(this.ids());
    ids.add(lessonId);
    window.localStorage.setItem(INDEX, JSON.stringify([...ids]));
  }

  list(): SavedProgress[] {
    return this.ids()
      .map((id) => this.load(id))
      .filter((row): row is SavedProgress => row !== null);
  }

  clear(lessonId: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(keyFor(lessonId));
  }

  loadComic(lessonId: string): ComicProgress | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(comicKeyFor(lessonId));
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as ComicProgress;
      if (!data || typeof data !== "object" || !data.learned) return null;
      return data;
    } catch {
      return null;
    }
  }

  saveComic(lessonId: string, data: ComicProgress): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(comicKeyFor(lessonId), JSON.stringify(data));
  }

  loadWortbank(): WortbankDoc | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(WORTBANK_KEY);
    if (!raw) return null;
    try {
      const data: unknown = JSON.parse(raw);
      return isWortbankDoc(data) ? data : null;
    } catch {
      return null;
    }
  }

  saveWortbank(data: WortbankDoc): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WORTBANK_KEY, JSON.stringify(data));
  }

  private ids(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(INDEX);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Stub for a future Supabase-backed store. Without NEXT_PUBLIC_SUPABASE_URL
 * the app never calls the network. When those env vars exist, swap this class
 * for the implementation sketched in docs/SUPABASE.md (debounce ~1s, merge
 * guest progress after login).
 */
export class SupabaseProgressStore implements ProgressStore {
  constructor(private readonly fallback: ProgressStore = new LocalProgressStore()) {}

  load(lessonId: string) {
    return this.fallback.load(lessonId);
  }
  save(lessonId: string, data: SavedProgress) {
    this.fallback.save(lessonId, data);
  }
  list() {
    return this.fallback.list();
  }
  clear(lessonId: string) {
    this.fallback.clear(lessonId);
  }
  loadComic(lessonId: string) {
    return this.fallback.loadComic(lessonId);
  }
  saveComic(lessonId: string, data: ComicProgress) {
    this.fallback.saveComic(lessonId, data);
  }
  loadWortbank() {
    return this.fallback.loadWortbank();
  }
  saveWortbank(data: WortbankDoc) {
    this.fallback.saveWortbank(data);
  }
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createProgressStore(): ProgressStore {
  if (supabaseConfigured()) return new SupabaseProgressStore();
  return new LocalProgressStore();
}

export function emptyProgress(lessonId: string): SavedProgress {
  return {
    lessonId,
    stepIndex: 0,
    pts: {},
    seen: {},
    hints: {},
    mc: {},
    tips: {},
    gapDone: {},
    gapTries: {},
    lines: {},
    built: {},
    buildTries: {},
    matched: {},
    matchTries: {},
    marks: {},
    coloured: {},
    colourTries: {},
    pen: "N",
    showEn: false,
    showCases: false,
    highlight: false,
    anim: {},
    writing: {},
    solved: {},
    wrong: {},
    updatedAt: new Date().toISOString(),
  };
}

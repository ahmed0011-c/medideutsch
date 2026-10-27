"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";

export interface SpeechEngine {
  supported: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "de-DE" && /google|natural|premium|enhanced/i.test(v.name)) ??
    voices.find((v) => v.lang === "de-DE") ??
    voices.find((v) => /^de/i.test(v.lang)) ??
    null
  );
}

/** Browser speechSynthesis (de-DE). Swap this engine later for stored MP3s. */
export function createBrowserSpeech(): SpeechEngine {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  return {
    supported,
    cancel() {
      if (supported) window.speechSynthesis.cancel();
    },
    speak(text: string) {
      if (!supported) return Promise.resolve();
      window.speechSynthesis.cancel();
      return new Promise((resolve) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "de-DE";
        utter.rate = 0.88;
        const voice = pickVoice();
        if (voice) utter.voice = voice;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      });
    },
  };
}

const AudioContext = createContext<SpeechEngine | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<SpeechEngine | null>(null);
  if (!engine.current) engine.current = createBrowserSpeech();
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => {
      engine.current = createBrowserSpeech();
    };
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);
  const value = useMemo(() => engine.current!, []);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useSpeech(): SpeechEngine {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    return {
      supported: false,
      speak: async () => {},
      cancel: () => {},
    };
  }
  return ctx;
}

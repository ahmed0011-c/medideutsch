"use client";

import type { Lesson } from "@/lib/lesson-schema";
import { LessonProvider } from "@/lib/lesson-context";
import { CaseReference } from "@/components/steps/CasesStep";

export function GrammarReference({ lesson }: { lesson: Lesson }) {
  return (
    <LessonProvider lesson={lesson} initialStep={null}>
      <CaseReference />
    </LessonProvider>
  );
}

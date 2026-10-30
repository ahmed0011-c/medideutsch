import fs from "fs";
import path from "path";
import { hoerenLessonSchema, type HoerenLesson } from "@/lib/hoeren-schema";

const ROOT = path.join(process.cwd(), "content", "hoeren");

export function hoerenFiles(): string[] {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => path.join(ROOT, name));
}

export function readHoerenFile(file: string): HoerenLesson {
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return hoerenLessonSchema.parse(raw);
}

let cache: HoerenLesson[] | null = null;

export function getAllHoeren(): HoerenLesson[] {
  if (cache) return cache;
  cache = hoerenFiles()
    .map(readHoerenFile)
    .sort((a, b) => a.episode - b.episode || a.title.localeCompare(b.title));
  return cache;
}

export function getHoerenBySlug(slug: string): HoerenLesson | undefined {
  return getAllHoeren().find((lesson) => lesson.slug === slug || lesson.id === slug);
}

export function validateHoerenLesson(lesson: HoerenLesson): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const line of lesson.lines) {
    if (ids.has(line.id)) issues.push(`duplicate line id ${line.id}`);
    ids.add(line.id);
  }
  const qids = new Set<string>();
  for (const q of lesson.questions) {
    if (qids.has(q.id)) issues.push(`duplicate question id ${q.id}`);
    qids.add(q.id);
    if (q.answer < 0 || q.answer >= q.choices.length) {
      issues.push(`${q.id}: answer index out of range`);
    }
  }
  if (lesson.questions.length < 5) issues.push("need at least 5 questions");
  return issues;
}

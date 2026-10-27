import fs from "fs";
import path from "path";
import { lessonSchema, type Lesson } from "@/lib/lesson-schema";

const ROOT = path.join(process.cwd(), "content", "lessons");

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) out.push(full);
  }
  return out;
}

export function lessonFiles(): string[] {
  return walk(ROOT);
}

export function readLessonFile(file: string): Lesson {
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return lessonSchema.parse(raw);
}

let cache: Lesson[] | null = null;

export function getAllLessons(): Lesson[] {
  if (cache) return cache;
  cache = lessonFiles()
    .map(readLessonFile)
    .sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

export function getLessonById(id: string): Lesson | undefined {
  return getAllLessons().find((lesson) => lesson.id === id);
}

/** Slugs used by the course map and the home track, so a static export includes every link. */
export function lessonPathSlugs(level: string): string[] {
  const lower = level.toLowerCase();
  const slugs = new Set<string>();
  slugs.add(lower.startsWith("a1") ? "a1" : lower);
  if (lower.startsWith("b1")) slugs.add("b1");
  else if (lower.startsWith("a2")) slugs.add("a2");
  else slugs.add("a1");
  return [...slugs];
}

export function getLesson(level: string, id: string): Lesson | undefined {
  const lesson = getLessonById(id);
  if (!lesson) return undefined;
  const folderOk = lesson.level.toLowerCase().replace("/", "") === level.toLowerCase()
    || lesson.level.toLowerCase().startsWith(level.toLowerCase());
  return folderOk ? lesson : lesson;
}

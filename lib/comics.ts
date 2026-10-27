import fs from "fs";
import path from "path";
import { comicLessonSchema, type ComicLesson } from "@/lib/comic-schema";

const ROOT = path.join(process.cwd(), "content", "comics");

export function comicFiles(): string[] {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => path.join(ROOT, name))
    .sort();
}

export function readComicFile(file: string): ComicLesson {
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return comicLessonSchema.parse(raw);
}

let cache: ComicLesson[] | null = null;

export function getAllComics(): ComicLesson[] {
  if (cache) return cache;
  cache = comicFiles().map(readComicFile);
  return cache;
}

export function getComicById(id: string): ComicLesson | undefined {
  return getAllComics().find((lesson) => lesson.id === id);
}

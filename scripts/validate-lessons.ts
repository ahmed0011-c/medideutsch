import fs from "fs";
import path from "path";
import { comicFiles, readComicFile } from "../lib/comics";
import { lessonFiles, readLessonFile } from "../lib/lessons";
import { validateComic } from "../lib/validate-comic";
import { validateLesson } from "../lib/validate-lesson";
import { getAllHoeren, validateHoerenLesson } from "../lib/hoeren";

const files = lessonFiles();
const template = path.join(process.cwd(), "content", "lessons", "_template.json");
if (fs.existsSync(template)) files.push(template);

let failed = 0;
for (const file of files) {
  let lesson;
  try {
    lesson = readLessonFile(file);
  } catch (error) {
    failed++;
    console.error(`\n${path.relative(process.cwd(), file)}`);
    console.error(error instanceof Error ? error.message : error);
    continue;
  }
  const issues = validateLesson(lesson);
  if (issues.length) {
    failed++;
    console.error(`\n${lesson.id}`);
    for (const issue of issues) console.error(`  - ${issue.message}`);
  } else {
    console.log(`ok  ${lesson.id}  (${lesson.steps.length} steps)`);
  }
}

if (!files.length) {
  console.error("No lesson files found.");
  process.exit(1);
}

const comics = comicFiles();
for (const file of comics) {
  let lesson;
  try {
    lesson = readComicFile(file);
  } catch (error) {
    failed++;
    console.error(`\n${path.relative(process.cwd(), file)}`);
    console.error(error instanceof Error ? error.message : error);
    continue;
  }
  const issues = validateComic(lesson);
  if (issues.length) {
    failed++;
    console.error(`\n${lesson.id}`);
    for (const issue of issues.slice(0, 30)) console.error(`  - ${issue.message}`);
    if (issues.length > 30) console.error(`  - … ${issues.length - 30} more`);
  } else {
    console.log(
      `ok  ${lesson.id}  (${lesson.chapters.length} chapters, ${lesson.panels.length} panels, ${lesson.vocab.length} vocab)`,
    );
  }
}

const hoerenLessons = getAllHoeren();
for (const lesson of hoerenLessons) {
  const issues = validateHoerenLesson(lesson);
  if (issues.length) {
    failed++;
    console.error(`\n${lesson.id}`);
    for (const issue of issues) console.error(`  - ${issue}`);
  } else {
    console.log(`ok  hoeren/${lesson.slug}  (${lesson.lines.length} lines, ${lesson.questions.length} questions)`);
  }
}

if (failed) {
  console.error(`\n${failed} file(s) failed.`);
  process.exit(1);
}
console.log(`\n${files.length} grammar lesson(s), ${comics.length} comic lesson(s), and ${hoerenLessons.length} listening lesson(s) valid.`);

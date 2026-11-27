// 教材の JSON（content-build の出力 src/content/generated/）を読む（設計書 2-1）。
// course.json は最初から、章ごとの chNN.json は開いたときに読み込む
import type { GeneratedChapterContent, GeneratedCourse, StepContent } from './schema';

export type ContentSource = {
  course: GeneratedCourse;
  loadChapter(chapterId: string): Promise<GeneratedChapterContent | null>;
};

const courseModules = import.meta.glob<GeneratedCourse>('./generated/course.json', {
  eager: true,
  import: 'default',
});
const chapterModules = import.meta.glob<GeneratedChapterContent>('./generated/ch*.json', {
  import: 'default',
});

const EMPTY_COURSE: GeneratedCourse = {
  version: '0',
  chapters: [],
  concepts: [],
  errors: [],
  gifts: [],
};

export function createGeneratedContent(): ContentSource {
  const course = courseModules['./generated/course.json'] ?? EMPTY_COURSE;
  return {
    course,
    async loadChapter(chapterId) {
      const load = chapterModules[`./generated/${chapterId}.json`];
      return load ? load() : null;
    },
  };
}

/** 'ch02.torch-row' → 'ch02' */
export function chapterIdOfStep(stepId: string): string {
  return stepId.split('.')[0] ?? '';
}

export async function loadStep(
  content: ContentSource,
  stepId: string,
): Promise<StepContent | null> {
  const chapter = await content.loadChapter(chapterIdOfStep(stepId));
  return chapter?.steps.find((s) => s.id === stepId) ?? null;
}

// 画面のテストで使う見本の教材（tests/content-fixtures/good。本物の教材の答えをテストに書かないため。設計書 14章）。
// content-build と同じ処理で JSON にする。scripts/ は Node の型を使うので、型を追わない動的 import で読む
import type { ContentSource } from '@/content/loader';
import type { GeneratedChapterContent, GeneratedCourse } from '@/content/schema';

type BuildOutput = { course: GeneratedCourse; chapters: GeneratedChapterContent[] };

const BUILD_MODULE = '../scripts/content-build.ts';
const CONTENT_MODULE = '../scripts/lib/content.ts';
const PATHS_MODULE = '../scripts/lib/paths.ts';

let cached: Promise<BuildOutput> | null = null;

async function build(): Promise<BuildOutput> {
  const { buildOutput } = (await import(/* @vite-ignore */ BUILD_MODULE)) as {
    buildOutput: (content: unknown, all: boolean) => BuildOutput;
  };
  const { loadContent } = (await import(/* @vite-ignore */ CONTENT_MODULE)) as {
    loadContent: (dir: string) => { issues: unknown[] };
  };
  const { ROOT } = (await import(/* @vite-ignore */ PATHS_MODULE)) as { ROOT: string };
  const dir = `${ROOT}/tests/content-fixtures/good`;
  const content = loadContent(dir);
  if (content.issues.length > 0)
    throw new Error(`見本の教材にエラー: ${JSON.stringify(content.issues)}`);
  return buildOutput(content, true);
}

/** 見本の教材（reviewed: false も含む） */
export async function fixtureContent(): Promise<ContentSource> {
  cached ??= build();
  const out = await cached;
  return {
    course: out.course,
    loadChapter: async (id) => out.chapters.find((c) => c.chapter === id) ?? null,
  };
}

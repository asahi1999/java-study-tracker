// 教材 → JSON（npm run content:build。設計書 6-8）。JDK は使わない。
// 出力: src/content/generated/{course.json, chNN.json, projects.json}、public/java/manifest.json
// 使い方: node scripts/content-build.ts [--all] [--content <dir>] [--out <dir>] [--public <dir>]
//   --all: reviewed: false のものも含める（開発用）
// ids.lock の検査はフェーズ2（設計書 13章）
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  GeneratedChapter,
  GeneratedChapterContent,
  GeneratedCourse,
  GeneratedProjects,
  ProjectContent,
  StepContent,
  StepSummary,
} from '../src/content/schema.ts';
import { samePredict } from '../src/domain/judge/predict.ts';
import { type JavaManifest, TEAVM_DIR, TEAVM_VERSION } from '../src/runtime/java/assets.ts';
import {
  type Issue,
  loadContent,
  type LoadedContent,
  type LoadedProblem,
  type LoadedProject,
} from './lib/content.ts';
import { CONTENT_DIR, PUBLIC_DIR, ROOT } from './lib/paths.ts';

export function toSummary(p: LoadedProblem): StepSummary {
  const f = p.front;
  return {
    id: f.id,
    rev: f.rev,
    type: f.type,
    title: f.title,
    chapter: f.chapter,
    part: f.part,
    order: f.order,
    minutes: f.minutes,
    optional: f.optional,
    easy: f.easy,
    goal: f.goal ?? null,
    render: f.render,
  };
}

export function toStepContent(p: LoadedProblem): StepContent {
  const f = p.front;
  let answer: number | null = f.answer ?? null;
  if (f.type === 'predict' && f.inputMode === 'choice' && f.choices && p.expected.has(0)) {
    const output = p.expected.get(0) ?? '';
    const index = f.choices.findIndex((c) => samePredict(output, c));
    answer = index >= 0 ? index : null;
  }
  const hints = (['ヒント1', 'ヒント2', 'ヒント3'] as const)
    .map((h) => p.sections[h])
    .filter((h): h is string => h !== undefined);
  return {
    ...toSummary(p),
    concepts: f.concepts ?? [],
    showcase: f.showcase,
    source: f.source ?? null,
    runtime: f.runtime,
    tiles: f.tiles ?? {},
    timeoutMs: f.timeoutMs,
    stdin: f.stdin,
    judge: f.judge
      ? {
          mode: f.judge.mode,
          cases: (f.judge.cases ?? []).map((c, i) => ({
            name: c.name,
            stdin: c.stdin,
            expected: p.expected.get(i + 1) ?? null,
          })),
        }
      : null,
    expectError: f.expectError
      ? {
          kind: f.expectError.kind,
          dex: f.expectError.dex ?? null,
          type: f.expectError.type ?? null,
        }
      : null,
    inputMode: f.inputMode ?? null,
    choices: f.choices ?? null,
    answer,
    allowExtra: f.allowExtra ?? [],
    body: {
      explain: p.sections['説明'] ?? null,
      problem: p.sections['問題'] ?? null,
      hints,
      commentary: p.sections['解説'] ?? null,
    },
    starter: p.starter,
    given: p.given,
    tests: p.tests,
    program: p.program,
    example: p.example,
    expectedOutput: p.expected.get(0) ?? null,
  };
}

export function toProjectContent(p: LoadedProject): ProjectContent {
  const { stages, ...front } = p.front;
  return {
    id: front.id,
    rev: front.rev,
    chapter: front.chapter,
    title: front.title,
    source: front.source,
    mainFile: front.mainFile,
    learnerFiles: front.learnerFiles,
    stages: stages.map((s) => ({
      ...s,
      stepId: `${front.id}.${s.id}`,
      body: p.stageBodies.get(s.id)?.body ?? '',
      hints: p.stageBodies.get(s.id)?.hints ?? [],
      cases: s.cases.map((c, i) => ({
        name: c.name,
        stdin: c.stdin,
        expected: p.expected.get(`${s.id}-${i + 1}`) ?? null,
      })),
    })),
    summary: p.summary,
    starter: p.starter,
    given: p.given,
    tests: p.tests,
  };
}

export type BuildOutput = {
  course: GeneratedCourse;
  chapters: GeneratedChapterContent[];
  projects: GeneratedProjects;
};

/** 読み込んだ教材から、出力する JSON を作る（公開するものだけ。all なら全部） */
export function buildOutput(content: LoadedContent, all: boolean): BuildOutput {
  const course = content.course;
  if (!course) throw new Error('course.yaml が読めていない');
  const published = content.problems.filter((p) => all || p.front.reviewed);
  const chapters: GeneratedChapter[] = course.chapters
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((ch) => {
      const partOrder = new Map(ch.parts.map((part, i) => [part.n, i]));
      const steps = published
        .filter((p) => p.front.chapter === ch.number)
        .sort(
          (a, b) =>
            (partOrder.get(a.front.part) ?? 0) - (partOrder.get(b.front.part) ?? 0) ||
            a.front.order - b.front.order,
        )
        .map(toSummary);
      return { ...ch, project: ch.project ?? null, steps };
    });
  const chapterContents: GeneratedChapterContent[] = chapters.map((ch) => ({
    chapter: ch.id,
    steps: ch.steps.map((s) =>
      toStepContent(published.find((p) => p.front.id === s.id) as LoadedProblem),
    ),
  }));
  return {
    course: {
      version: course.version,
      chapters,
      concepts: content.concepts,
      errors: content.errors,
      gifts: content.gifts,
    },
    chapters: chapterContents,
    projects: {
      projects: content.projects.filter((p) => all || p.front.reviewed).map(toProjectContent),
    },
  };
}

/** public/java/manifest.json（各ファイルの大きさ。読み込みの進み具合に使う。設計書 4-10） */
export function buildJavaManifest(publicDir: string): JavaManifest {
  const dir = path.join(publicDir, TEAVM_DIR);
  const sizes: Record<string, number> = {};
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).sort()) {
      if (f === 'SHA256SUMS' || f.endsWith('.md')) continue;
      sizes[f] = statSync(path.join(dir, f)).size;
    }
  }
  return { teavm: { version: TEAVM_VERSION, dir: TEAVM_DIR, sizes } };
}

export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `  content/${i.file}: ${i.message}`).join('\n');
}

function writeJson(file: string, data: unknown) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function runBuild(options: {
  contentDir: string;
  outDir: string;
  publicDir: string;
  all: boolean;
}): {
  issues: Issue[];
  output: BuildOutput | null;
} {
  const content = loadContent(options.contentDir);
  if (content.issues.length > 0) return { issues: content.issues, output: null };
  const output = buildOutput(content, options.all);
  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });
  writeJson(path.join(options.outDir, 'course.json'), output.course);
  for (const ch of output.chapters) writeJson(path.join(options.outDir, `${ch.chapter}.json`), ch);
  writeJson(path.join(options.outDir, 'projects.json'), output.projects);
  mkdirSync(path.join(options.publicDir, 'java'), { recursive: true });
  writeJson(
    path.join(options.publicDir, 'java', 'manifest.json'),
    buildJavaManifest(options.publicDir),
  );
  return { issues: [], output };
}

function argValue(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

function main() {
  const args = process.argv.slice(2);
  const started = performance.now();
  const contentDir = path.resolve(argValue(args, '--content') ?? CONTENT_DIR);
  const outDir = path.resolve(
    argValue(args, '--out') ?? path.join(ROOT, 'src', 'content', 'generated'),
  );
  const publicDir = path.resolve(argValue(args, '--public') ?? PUBLIC_DIR);
  const { issues, output } = runBuild({
    contentDir,
    outDir,
    publicDir,
    all: args.includes('--all'),
  });
  if (issues.length > 0 || !output) {
    console.error(
      `content-build: 教材にエラーが ${issues.length} 件あります\n${formatIssues(issues)}`,
    );
    process.exit(1);
  }
  const steps = output.chapters.reduce((n, ch) => n + ch.steps.length, 0);
  const ms = Math.round(performance.now() - started);
  console.log(
    `content-build: ${steps} ステップ、手元課題 ${output.projects.projects.length} 件（${ms}ms）`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

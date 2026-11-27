// 教材の形式（設計書 6章）の Zod スキーマと、content-build が出す JSON の型。
// scripts/（Node で直接動かす）と画面の両方が読むので、型を取り除くだけで動く書き方にする。
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 共通

export const STEP_ID_RE = /^ch\d{2}\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CHAPTER_ID_RE = /^ch\d{2}$/;
export const PROJECT_ID_RE = /^p\d{2}$/;
export const CONTENT_VERSION_RE = /^\d{4}\.\d{2}\.\d{2}-\d+$/;

export const STEP_TYPES = [
  'card',
  'predict',
  'quiz',
  'fill',
  'fix',
  'implement',
  'draw',
  'parsons',
] as const;
export type StepType = (typeof STEP_TYPES)[number];

/** エディタで書いて実行する種類（judge が必須） */
export const WRITE_TYPES = [
  'fill',
  'fix',
  'implement',
  'draw',
] as const satisfies readonly StepType[];
/** source（compact | class）が必須の種類。card は Example.java があるときだけ必須（content-build が見る） */
export const SOURCE_REQUIRED_TYPES = [
  'predict',
  'fill',
  'fix',
  'implement',
  'draw',
  'parsons',
] as const satisfies readonly StepType[];

export const isWriteType = (t: StepType): boolean => (WRITE_TYPES as readonly string[]).includes(t);

/** タイルの名前（設計書 8-2） */
export const TILE_NAMES = [
  'void',
  'floor',
  'wall',
  'door',
  'hero',
  'stairs-down',
  'stairs-up',
  'torch',
  'gold',
  'potion',
  'chest',
  'water',
  'trap',
  'grass',
  'pillar',
  'bar-full',
  'bar-empty',
  'bar-cap',
  'digit',
  'glyph',
] as const;

/** 問題の tiles で英大文字に割り当てられる魔物（後続 F-TILE-2） */
export const MONSTER_TILES = [
  'slime',
  'bat',
  'skeleton',
  'chaser',
  'ghost',
  'dragon',
  'npc',
] as const;

export const EXPECT_KINDS = ['compile', 'exception', 'test', 'timeout'] as const;
export type ExpectKind = (typeof EXPECT_KINDS)[number];

const JAVA_CLASS_NAME_RE = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/;

// ---------------------------------------------------------------------------
// problem.md の前書き（設計書 6-2）

const caseSchema = z
  .object({
    name: z.string().min(1),
    stdin: z.string().default(''),
  })
  .strict();

const judgeSchema = z
  .object({
    mode: z.enum(['output', 'tests', 'both']),
    cases: z.array(caseSchema).optional(),
  })
  .strict();

const expectErrorSchema = z
  .object({
    kind: z.enum(EXPECT_KINDS),
    dex: z.string().regex(SLUG_RE).optional(),
    type: z.string().regex(JAVA_CLASS_NAME_RE).optional(),
  })
  .strict();

export const problemFrontSchema = z
  .object({
    id: z.string().regex(STEP_ID_RE, 'ch<2桁>.<英小文字・数字・->'),
    rev: z.number().int().min(1),
    type: z.enum(STEP_TYPES),
    title: z.string().min(1).max(20),
    chapter: z.number().int().min(0).max(9),
    part: z.number().int().min(1),
    order: z.number().int().min(0),
    concepts: z.array(z.string().regex(SLUG_RE)).optional(),
    minutes: z.number().int().min(1).max(3),
    goal: z.string().min(1).max(20).optional(),
    optional: z.boolean().default(false),
    easy: z.boolean().default(false),
    showcase: z.boolean().default(false),
    source: z.enum(['compact', 'class']).optional(),
    runtime: z.enum(['browser', 'local']).default('browser'),
    render: z.enum(['text', 'tiles']).default('text'),
    tiles: z.record(z.string().regex(/^[A-Z]$/), z.enum(MONSTER_TILES)).optional(),
    timeoutMs: z.number().int().min(1000).max(10000).default(3000),
    stdin: z.string().default(''),
    judge: judgeSchema.optional(),
    expectError: expectErrorSchema.optional(),
    inputMode: z.enum(['text', 'choice']).optional(),
    choices: z.array(z.string()).min(2).max(4).optional(),
    answer: z.number().int().min(0).optional(),
    allowExtra: z
      .array(z.object({ api: z.string().min(1), reason: z.string().min(1) }).strict())
      .optional(),
    reviewed: z.boolean(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    const write = isWriteType(p.type);

    if (p.type !== 'card' && p.type !== 'quiz' && (!p.concepts || p.concepts.length === 0)) {
      issue('concepts', `${p.type} では必須（1つ以上）`);
    }
    if ((SOURCE_REQUIRED_TYPES as readonly string[]).includes(p.type) && !p.source) {
      issue('source', `${p.type} では必須`);
    }
    if (p.type === 'quiz' && p.source) issue('source', 'quiz では使わない');

    // judge
    if (write && !p.judge) issue('judge', `${p.type} では必須`);
    if (!write && p.judge) issue('judge', `${p.type} では使わない`);
    if (p.judge) {
      const needsCases = p.judge.mode === 'output' || p.judge.mode === 'both';
      if (needsCases && (!p.judge.cases || p.judge.cases.length === 0)) {
        issue('judge', `mode: ${p.judge.mode} では cases が1件以上必要`);
      }
      if (!needsCases && p.judge.cases && p.judge.cases.length > 0) {
        issue('judge', 'mode: tests では cases を書かない（Tests.java で判定する）');
      }
    }

    // expectError
    if (p.type === 'fix' && !p.expectError) issue('expectError', 'fix では必須');
    if (p.expectError && !write) issue('expectError', `${p.type} では使わない`);
    if (p.expectError) {
      const { kind, dex, type } = p.expectError;
      if ((kind === 'compile' || kind === 'exception') && !dex) {
        issue('expectError', `kind: ${kind} では dex（errors.yaml の ID）が必須`);
      }
      if (kind === 'exception' && !type) issue('expectError', 'kind: exception では type が必須');
      if (kind !== 'exception' && type) issue('expectError', `type は kind: exception のときだけ`);
      if ((kind === 'test' || kind === 'timeout') && dex) {
        issue('expectError', `dex は kind: compile・exception のときだけ`);
      }
    }

    // predict・quiz
    if (p.type === 'predict' && !p.inputMode) issue('inputMode', 'predict では必須');
    if (p.type !== 'predict' && p.inputMode) issue('inputMode', `${p.type} では使わない`);
    const needsChoices = p.type === 'quiz' || (p.type === 'predict' && p.inputMode === 'choice');
    if (needsChoices && !p.choices) issue('choices', '選択肢（2〜4個）が必須');
    if (!needsChoices && p.choices) issue('choices', 'predict の choice と quiz だけで使う');
    if (p.type === 'quiz') {
      if (p.answer === undefined) issue('answer', 'quiz では必須');
      else if (p.choices && p.answer >= p.choices.length) issue('answer', '選択肢の範囲の外');
    } else if (p.answer !== undefined) {
      issue('answer', 'quiz だけで使う（predict の正解は expected/0.txt から決まる）');
    }

    // そのほか
    if (p.tiles && p.render !== 'tiles') issue('tiles', 'render: tiles のときだけ');
    if (p.type === 'quiz' && p.runtime === 'local') issue('runtime', 'quiz では使わない');
  });

export type ProblemFront = z.infer<typeof problemFrontSchema>;

/** 本文の見出し（設計書 6-3） */
export const SECTION_NAMES = ['説明', '問題', 'ヒント1', 'ヒント2', 'ヒント3', '解説'] as const;
export type SectionName = (typeof SECTION_NAMES)[number];

type SectionRule = { required: SectionName[]; optional: SectionName[] };

const WRITE_SECTIONS: SectionRule = {
  required: ['問題', 'ヒント1', 'ヒント2', 'ヒント3', '解説'],
  optional: [],
};

export const SECTION_RULES: Record<StepType, SectionRule> = {
  card: { required: ['説明'], optional: [] },
  predict: { required: ['問題', '解説'], optional: ['ヒント1'] },
  quiz: { required: ['問題', '解説'], optional: ['ヒント1'] },
  fill: WRITE_SECTIONS,
  fix: WRITE_SECTIONS,
  implement: WRITE_SECTIONS,
  draw: WRITE_SECTIONS,
  parsons: { required: ['問題', '解説'], optional: ['ヒント1', 'ヒント2', 'ヒント3'] },
};

// ---------------------------------------------------------------------------
// course.yaml・concepts.yaml・errors.yaml・gifts.yaml（設計書 6-5・4-8）

export const courseSchema = z
  .object({
    version: z.string().regex(CONTENT_VERSION_RE, 'YYYY.MM.DD-N'),
    chapters: z
      .array(
        z
          .object({
            id: z.string().regex(CHAPTER_ID_RE),
            number: z.number().int().min(0).max(9),
            title: z.string().min(1),
            dungeon: z
              .object({ version: z.string().regex(/^v\d+\.\d+$/), adds: z.string().min(1) })
              .strict(),
            plannedMinutes: z.number().int().min(0),
            askStage: z.string().min(1),
            parts: z
              .array(z.object({ n: z.number().int().min(1), title: z.string().min(1) }).strict())
              .default([]),
            allow: z
              .object({
                keywords: z.array(z.string()).default([]),
                apis: z.array(z.string()).default([]),
              })
              .strict(),
            project: z.string().regex(PROJECT_ID_RE).optional(),
          })
          .strict()
          .superRefine((c, ctx) => {
            if (c.id !== `ch${String(c.number).padStart(2, '0')}`) {
              ctx.addIssue({ code: 'custom', path: ['id'], message: 'number と合わない' });
            }
            const seen = new Set<number>();
            for (const part of c.parts) {
              if (seen.has(part.n)) {
                ctx.addIssue({ code: 'custom', path: ['parts'], message: `n: ${part.n} が重複` });
              }
              seen.add(part.n);
            }
          }),
      )
      .min(1),
  })
  .strict()
  .superRefine((course, ctx) => {
    const seen = new Set<string>();
    for (const c of course.chapters) {
      if (seen.has(c.id))
        ctx.addIssue({ code: 'custom', path: ['chapters'], message: `${c.id} が重複` });
      seen.add(c.id);
    }
  });

export type Course = z.infer<typeof courseSchema>;
export type CourseChapter = Course['chapters'][number];

export const conceptsSchema = z.array(
  z
    .object({
      id: z.string().regex(SLUG_RE),
      name: z.string().min(1),
      chapter: z.number().int().min(0).max(9),
      oneLine: z.string().min(1),
    })
    .strict(),
);
export type Concept = z.infer<typeof conceptsSchema>[number];

function isValidRegex(source: string): boolean {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

const regexList = z.array(z.string().refine(isValidRegex, '正規表現として読めない')).min(1);

export const errorsSchema = z.array(
  z
    .object({
      id: z.string().regex(SLUG_RE),
      no: z.number().int().min(1),
      name: z.string().min(1),
      kind: z.enum(['compile', 'runtime', 'limit']),
      match: z
        .object({
          javacEn: regexList.optional(),
          javacJa: regexList.optional(),
          exception: z.array(z.string().regex(JAVA_CLASS_NAME_RE)).min(1).optional(),
        })
        .strict()
        .default({}),
      summary: z.string().min(1),
      causes: z.array(z.string().min(1)).min(1),
      fix: z.string().min(1),
      chapter: z.number().int().min(0).max(9),
      fixture: z.boolean().default(false),
    })
    .strict()
    .superRefine((e, ctx) => {
      const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['match'], message });
      if (e.kind === 'compile' && (!e.match.javacEn || !e.match.javacJa)) {
        issue('kind: compile では javacEn と javacJa が必須');
      }
      if (e.kind === 'runtime' && !e.match.exception) issue('kind: runtime では exception が必須');
      if (e.kind === 'limit' && (e.match.javacEn || e.match.javacJa || e.match.exception)) {
        issue('kind: limit では match を書かない（時間切れ・出力の上限は固定の ID）');
      }
      if (e.kind !== 'compile' && (e.match.javacEn || e.match.javacJa)) {
        issue('javacEn・javacJa は kind: compile のときだけ');
      }
    }),
);
export type ErrorEntry = z.infer<typeof errorsSchema>[number];

export const giftsSchema = z.array(
  z
    .object({
      id: z.string().regex(SLUG_RE),
      name: z.string().min(1),
      tile: z.enum(TILE_NAMES),
      sprite: z.string().regex(SLUG_RE),
    })
    .strict(),
);
export type Gift = z.infer<typeof giftsSchema>[number];

// ---------------------------------------------------------------------------
// project.md の前書き（設計書 6-6）

export const projectFrontSchema = z
  .object({
    id: z.string().regex(PROJECT_ID_RE),
    rev: z.number().int().min(1),
    chapter: z.number().int().min(0).max(9),
    title: z.string().min(1).max(20),
    source: z.enum(['compact', 'class', 'spring']),
    mainFile: z.string().regex(/^[A-Z][\w]*\.java$/),
    learnerFiles: z.array(z.string().regex(/^[A-Z][\w]*\.java$/)).min(1),
    stages: z
      .array(
        z
          .object({
            id: z.string().regex(SLUG_RE),
            n: z.number().int().min(1),
            title: z.string().min(1),
            minutes: z.number().int().min(5).max(25),
            mode: z.enum(['output', 'tests', 'both']),
            cases: z.array(caseSchema).default([]),
          })
          .strict(),
      )
      .min(1),
    reviewed: z.boolean(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['stages'], message });
    if (!p.learnerFiles.includes(p.mainFile)) {
      ctx.addIssue({ code: 'custom', path: ['mainFile'], message: 'learnerFiles に入れる' });
    }
    const ids = new Set<string>();
    const ns = new Set<number>();
    for (const s of p.stages) {
      if (ids.has(s.id)) issue(`段階の id「${s.id}」が重複`);
      if (ns.has(s.n)) issue(`段階の n: ${s.n} が重複`);
      ids.add(s.id);
      ns.add(s.n);
      if ((s.mode === 'output' || s.mode === 'both') && s.cases.length === 0) {
        issue(`段階「${s.id}」: mode: ${s.mode} では cases が1件以上必要`);
      }
    }
    const sorted = [...ns].sort((a, b) => a - b);
    if (sorted.some((n, i) => n !== i + 1)) issue('n は 1 から順に振る');
  });
export type ProjectFront = z.infer<typeof projectFrontSchema>;

// ---------------------------------------------------------------------------
// content-build の出力（src/content/generated/*.json）の型

export type StepSummary = {
  id: string;
  rev: number;
  type: StepType;
  title: string;
  chapter: number;
  part: number;
  order: number;
  minutes: number;
  optional: boolean;
  easy: boolean;
  goal: string | null;
  render: 'text' | 'tiles';
};

export type GeneratedChapter = Omit<CourseChapter, 'project'> & {
  project: string | null;
  steps: StepSummary[]; // 公開するステップを、部品 → order の順に
};

/** course.json */
export type GeneratedCourse = {
  version: string;
  chapters: GeneratedChapter[];
  concepts: Concept[];
  errors: ErrorEntry[];
  gifts: Gift[];
};

export type StarterContent = {
  code: string; // 印（//@write・//@fold・//@end）を取り除いたもの
  writeLines: number[]; // 「書くのはここ」の行（1始まり）
  folds: { from: number; to: number; label: string }[]; // 折りたたむ範囲（1始まり、両端を含む）
};

export type GeneratedCase = { name: string; stdin: string; expected: string | null };

/** chNN.json の1ステップ。Solution・wrong・alt は入れない */
export type StepContent = StepSummary & {
  concepts: string[];
  showcase: boolean;
  source: 'compact' | 'class' | null;
  runtime: 'browser' | 'local';
  tiles: Record<string, string>;
  timeoutMs: number;
  stdin: string;
  judge: { mode: 'output' | 'tests' | 'both'; cases: GeneratedCase[] } | null;
  expectError: { kind: ExpectKind; dex: string | null; type: string | null } | null;
  inputMode: 'text' | 'choice' | null;
  choices: string[] | null;
  /** quiz の正解。predict の choice では expected/0.txt と一致する選択肢 */
  answer: number | null;
  allowExtra: { api: string; reason: string }[];
  body: {
    explain: string | null;
    problem: string | null;
    hints: string[];
    commentary: string | null;
  };
  starter: StarterContent | null;
  given: { path: string; content: string }[];
  tests: string | null;
  program: string | null; // predict の Program.java
  example: string | null; // card の Example.java
  /** predict・card の Program・Example の出力（expected/0.txt） */
  expectedOutput: string | null;
};

/** chNN.json */
export type GeneratedChapterContent = { chapter: string; steps: StepContent[] };

export type ProjectStageContent = ProjectFront['stages'][number] & {
  stepId: string; // 'p03.walls'
  body: string;
  hints: string[];
  cases: GeneratedCase[];
};

export type ProjectContent = Omit<ProjectFront, 'stages' | 'reviewed'> & {
  stages: ProjectStageContent[];
  summary: string | null; // ## まとめ
  starter: { path: string; content: string }[];
  given: { path: string; content: string }[];
  tests: string | null;
};

/** projects.json */
export type GeneratedProjects = { projects: ProjectContent[] };

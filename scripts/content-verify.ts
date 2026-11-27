// 教材を JDK 25 と teavm-javac で動かして確かめる（npm run content:verify。設計書 6-9）。
// 使い方: npm run content:verify -- [--only ch02 | --only ch02.torch-row] [--update] [--jobs 4] [--no-teavm]
//   --update: expected/*.txt を JDK の出力から作り直す（teavm と違うときは書き直さずに落とす）
//   --content <dir>: 教材のフォルダ（既定は content/。テストで使う）
// フェーズ1 の範囲: Solution・alt・Starter・wrong の落ち方、expected の作成、JDK と teavm の一致、
// predict・card の出力、errors.yaml の fixture。使ってよい文法・キャッシュなどはフェーズ2
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPlainRunJob, buildRunJob } from '../src/content/runJob.ts';
import type { ErrorEntry, StepContent } from '../src/content/schema.ts';
import { normalizeOutput } from '../src/domain/java/text.ts';
import type { RunJob, RunResult } from '../src/runtime/java/JavaRunner.ts';
import { toStepContent } from './content-build.ts';
import {
  type ExpectDecl,
  loadContent,
  type LoadedContent,
  type LoadedProblem,
} from './lib/content.ts';
import { CONTENT_DIR } from './lib/paths.ts';
import {
  checkAllPass,
  checkExpectation,
  compareOutputs,
  describeDecl,
  type Engine,
  ENGINE_LABEL,
  findDefaultToString,
  firstError,
  mapPool,
  matchesDex,
  runOnEngine,
} from './lib/verify.ts';

export type VerifyOptions = {
  contentDir: string;
  only: string | null;
  update: boolean;
  jobs: number;
  teavm: boolean;
  log?: (line: string) => void;
};

export type ItemReport = { id: string; ok: boolean; problems: string[] };

export type VerifyReport = {
  /** スキーマ・参照の検査で落ちたもの（これがあると Java は動かさない） */
  schemaIssues: string[];
  items: ItemReport[];
  ok: boolean;
};

function defaultJobs(): number {
  return Math.max(1, Math.min(4, os.cpus().length - 1));
}

function matchesOnly(id: string, only: string | null): boolean {
  if (!only) return true;
  return id === only || id.startsWith(`${only}.`);
}

type Ctx = { opts: VerifyOptions; errors: ErrorEntry[]; engines: Engine[] };

/** 同じ RunJob を使うエンジン全部で動かす */
async function runAll(ctx: Ctx, job: RunJob, timeoutMs?: number): Promise<Map<Engine, RunResult>> {
  const results = new Map<Engine, RunResult>();
  for (const engine of ctx.engines)
    results.set(engine, await runOnEngine(engine, job, { timeoutMs }));
  return results;
}

/** 宣言した落ち方で、両方のエンジンが落ちるか */
async function expectFailure(
  ctx: Ctx,
  label: string,
  job: RunJob,
  decl: ExpectDecl,
  out: string[],
): Promise<void> {
  const timeoutMs = decl.kind === 'timeout' ? job.timeoutMs : undefined;
  const results = await runAll(ctx, job, timeoutMs);
  for (const [engine, result] of results) {
    const why = checkExpectation(decl, result, ctx.errors, 'en');
    if (why) out.push(`${label}（${ENGINE_LABEL[engine]}）: ${why}`);
  }
  // 日本語の JDK の文言も、図鑑の判定に当たること（手元で動かしたとき）
  if (decl.kind === 'compile' && decl.dex) {
    const ja = await runOnEngine('jdk', job, { lang: 'ja' });
    const why = checkExpectation(decl, ja, ctx.errors, 'ja');
    if (why) out.push(`${label}（JDK 日本語）: ${why}`);
  }
}

/** 全部の松明がともり、JDK と teavm の出力が一致するか */
async function expectPass(
  ctx: Ctx,
  label: string,
  job: RunJob,
  out: string[],
): Promise<Map<Engine, RunResult>> {
  const results = await runAll(ctx, job);
  for (const [engine, result] of results) {
    const why = checkAllPass(result);
    if (why) out.push(`${label}（${ENGINE_LABEL[engine]}）: ${why}`);
  }
  const jdk = results.get('jdk');
  const teavm = results.get('teavm');
  if (jdk && teavm) {
    const diff = compareOutputs(jdk, teavm);
    if (diff) out.push(`${label}: ${diff}`);
  }
  if (jdk) {
    const bad = findDefaultToString(jdk);
    if (bad) out.push(`${label}: ${bad}`);
  }
  return results;
}

function writeExpected(p: LoadedProblem, index: number, text: string) {
  mkdirSync(path.join(p.dir, 'expected'), { recursive: true });
  writeFileSync(path.join(p.dir, 'expected', `${index}.txt`), text, 'utf8');
  p.expected.set(index, text);
}

/** --update: 模範解答の出力から expected/<i>.txt を作る（JDK と teavm が一致したときだけ） */
async function updateExpected(
  ctx: Ctx,
  p: LoadedProblem,
  step: StepContent,
  out: string[],
  log: (s: string) => void,
) {
  const solution = p.solution ?? '';
  const blank: StepContent = {
    ...step,
    judge: step.judge
      ? { ...step.judge, cases: step.judge.cases.map((c) => ({ ...c, expected: null })) }
      : null,
  };
  const results = await runAll(ctx, buildRunJob(blank, solution));
  const jdk = results.get('jdk') as RunResult;
  if (jdk.kind !== 'judged') {
    out.push(`expected の作成: 模範解答が最後まで動かない（JDK: ${jdk.kind}）`);
    return;
  }
  const teavm = results.get('teavm');
  if (teavm) {
    const diff = compareOutputs(jdk, teavm);
    if (diff) {
      out.push(`expected の作成: ${diff}。書き直さない`);
      return;
    }
  }
  for (const c of jdk.stages.flatMap((s) => s.cases)) {
    if (p.expected.get(c.index) !== c.actual) {
      writeExpected(p, c.index, c.actual);
      log(`  書いた: ${p.rel}/expected/${c.index}.txt`);
    }
  }
}

async function updatePlainExpected(
  ctx: Ctx,
  p: LoadedProblem,
  job: RunJob,
  out: string[],
  log: (s: string) => void,
) {
  const results = await runAll(ctx, job);
  const jdk = results.get('jdk') as RunResult;
  if (jdk.kind !== 'judged' || !jdk.asIs) {
    out.push(`expected の作成: コードが最後まで動かない（JDK: ${jdk.kind}）`);
    return;
  }
  const teavm = results.get('teavm');
  if (teavm) {
    const diff = compareOutputs(jdk, teavm);
    if (diff) {
      out.push(`expected の作成: ${diff}。書き直さない`);
      return;
    }
  }
  if (p.expected.get(0) !== jdk.asIs.actual) {
    writeExpected(p, 0, jdk.asIs.actual);
    log(`  書いた: ${p.rel}/expected/0.txt`);
  }
}

async function verifyProblem(ctx: Ctx, p: LoadedProblem): Promise<ItemReport> {
  const log = ctx.opts.log ?? (() => {});
  const out: string[] = [];
  const f = p.front;
  try {
    if (f.type === 'fill' || f.type === 'fix' || f.type === 'implement' || f.type === 'draw') {
      if (ctx.opts.update) await updateExpected(ctx, p, toStepContent(p), out, log);
      if (out.length > 0) return { id: f.id, ok: false, problems: out };
      const step = toStepContent(p);
      await expectPass(ctx, 'Solution', buildRunJob(step, p.solution ?? ''), out);
      for (const a of p.alt)
        await expectPass(ctx, `alt/${a.name}.java`, buildRunJob(step, a.content), out);
      const starterDecl: ExpectDecl = step.expectError
        ? step.expectError.kind === 'compile'
          ? { kind: 'compile', dex: step.expectError.dex }
          : step.expectError.kind === 'exception'
            ? { kind: 'exception', type: step.expectError.type ?? '' }
            : { kind: step.expectError.kind }
        : { kind: 'test' };
      await expectFailure(
        ctx,
        `Starter（${describeDecl(starterDecl)}）`,
        buildRunJob(step, step.starter?.code ?? ''),
        starterDecl,
        out,
      );
      for (const w of p.wrong) {
        if (!w.expect) continue;
        await expectFailure(
          ctx,
          `wrong/${w.name}.java（${describeDecl(w.expect)}）`,
          buildRunJob(step, w.content),
          w.expect,
          out,
        );
      }
    } else if (f.type === 'predict' || (f.type === 'card' && p.example !== null)) {
      const code = (f.type === 'predict' ? p.program : p.example) ?? '';
      const label = f.type === 'predict' ? 'Program.java' : 'Example.java';
      const job = buildPlainRunJob(toStepContent(p), code);
      if (ctx.opts.update) await updatePlainExpected(ctx, p, job, out, log);
      if (out.length > 0) return { id: f.id, ok: false, problems: out };
      const results = await runAll(ctx, job);
      for (const [engine, r] of results) {
        if (r.kind !== 'judged')
          out.push(`${label}（${ENGINE_LABEL[engine]}）: 最後まで動かない（${r.kind}）`);
        else if (
          normalizeOutput(r.asIs?.actual ?? '') !== normalizeOutput(p.expected.get(0) ?? '')
        ) {
          out.push(`${label}（${ENGINE_LABEL[engine]}）: 出力が expected/0.txt と違う`);
        }
      }
      const jdk = results.get('jdk');
      const teavm = results.get('teavm');
      if (jdk && teavm) {
        const diff = compareOutputs(jdk, teavm);
        if (diff) out.push(`${label}: ${diff}`);
      }
      if (jdk) {
        const bad = findDefaultToString(jdk);
        if (bad) out.push(`${label}: ${bad}`);
      }
    }
  } catch (e) {
    out.push(`検証の途中でエラー: ${(e as Error).message}`);
  }
  return { id: f.id, ok: out.length === 0, problems: out };
}

/** errors.yaml の fixture: true を確かめる（設計書 6-9） */
async function verifyErrorFixture(ctx: Ctx, entry: ErrorEntry, code: string): Promise<ItemReport> {
  const out: string[] = [];
  const job: RunJob = {
    stepId: `errors.${entry.id}`,
    rev: 1,
    source: 'compact',
    learnerFiles: [{ path: 'Main.java', content: code }],
    givenFiles: [],
    testsJava: null,
    stdin: '',
    stages: [],
    timeoutMs: 3000,
  };
  try {
    if (entry.kind === 'compile') {
      const runs: [string, Promise<RunResult>, 'en' | 'ja'][] = [
        ['JDK', runOnEngine('jdk', job, { lang: 'en' }), 'en'],
        ['JDK 日本語', runOnEngine('jdk', job, { lang: 'ja' }), 'ja'],
      ];
      if (ctx.engines.includes('teavm')) runs.push(['teavm', runOnEngine('teavm', job), 'en']);
      for (const [label, promise, lang] of runs) {
        const r = await promise;
        if (r.kind !== 'compile-error') {
          out.push(`${label}: コンパイルエラーにならない（${r.kind}）`);
          continue;
        }
        const first = firstError(r.diagnostics);
        if (!first || !matchesDex(first.message, entry, lang)) {
          out.push(
            `${label}: 最初のエラー「${first?.message.split('\n')[0] ?? 'なし'}」が判定に当たらない`,
          );
        }
      }
    } else if (entry.kind === 'runtime') {
      const types: string[] = [];
      for (const engine of ctx.engines) {
        const r = await runOnEngine(engine, job);
        const type =
          r.kind === 'judged'
            ? (r.asIs?.error?.type ?? null)
            : r.kind === 'crash'
              ? r.error.type
              : null;
        if (!type || !(entry.match.exception ?? []).includes(type)) {
          out.push(`${ENGINE_LABEL[engine]}: 例外の型「${type ?? r.kind}」が判定に当たらない`);
        }
        types.push(type ?? '');
      }
      if (types.length === 2 && types[0] !== types[1])
        out.push(`例外の型が JDK と teavm で違う（${types.join('・')}）`);
    }
  } catch (e) {
    out.push(`検証の途中でエラー: ${(e as Error).message}`);
  }
  return { id: `errors.yaml ${entry.id}`, ok: out.length === 0, problems: out };
}

export async function verifyContent(opts: VerifyOptions): Promise<VerifyReport> {
  const log = opts.log ?? (() => {});
  const content: LoadedContent = loadContent(opts.contentDir);
  const schemaIssues = content.issues
    .filter((i) => !(opts.update && i.code === 'missing-expected'))
    .filter(
      (i) =>
        !(
          i.code === 'missing-expected' &&
          !content.problems.some(
            (p) => i.file.startsWith(p.rel) && matchesOnly(p.front.id, opts.only),
          )
        ),
    )
    .map((i) => `content/${i.file}: ${i.message}`);
  if (schemaIssues.length > 0) return { schemaIssues, items: [], ok: false };

  const ctx: Ctx = {
    opts,
    errors: content.errors,
    engines: opts.teavm ? ['jdk', 'teavm'] : ['jdk'],
  };
  const targets = content.problems.filter((p) => matchesOnly(p.front.id, opts.only));
  const fixtureTargets = opts.only
    ? []
    : content.errors.filter((e) => e.fixture && (e.kind === 'compile' || e.kind === 'runtime'));
  if (opts.only && targets.length === 0) {
    return { schemaIssues: [`--only ${opts.only} に当たる問題が無い`], items: [], ok: false };
  }

  const tasks: (() => Promise<ItemReport>)[] = [
    ...targets.map((p) => () => verifyProblem(ctx, p)),
    ...fixtureTargets.map((e) => () => {
      const code = readFileSync(
        path.join(opts.contentDir, 'errors-fixtures', `${e.id}.java`),
        'utf8',
      );
      return verifyErrorFixture(ctx, e, code);
    }),
  ];
  const items = await mapPool(tasks, opts.jobs, async (task) => {
    const report = await task();
    log(
      report.ok
        ? `OK  ${report.id}`
        : `NG  ${report.id}\n${report.problems.map((p) => `      ${p}`).join('\n')}`,
    );
    return report;
  });
  return { schemaIssues: [], items, ok: items.every((i) => i.ok) };
}

function parseArgs(args: string[]): VerifyOptions {
  const opts: VerifyOptions = {
    contentDir: CONTENT_DIR,
    only: null,
    update: false,
    jobs: defaultJobs(),
    teavm: true,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const value = () => {
      const v = args[++i];
      if (v === undefined) throw new Error(`${a} の値が無い`);
      return v;
    };
    if (a === '--only') opts.only = value();
    else if (a === '--update') opts.update = true;
    else if (a === '--jobs') opts.jobs = Math.max(1, Number(value()) || 1);
    else if (a === '--no-teavm') opts.teavm = false;
    else if (a === '--content') opts.contentDir = path.resolve(value());
    else throw new Error(`知らないオプション: ${a}`);
  }
  return opts;
}

async function main() {
  let opts: VerifyOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`content-verify: ${(e as Error).message}`);
    process.exit(2);
  }
  const started = performance.now();
  const report = await verifyContent({ ...opts, log: (line) => console.log(line) });
  if (report.schemaIssues.length > 0) {
    console.error(`content-verify: 教材にエラーが ${report.schemaIssues.length} 件あります`);
    for (const i of report.schemaIssues) console.error(`  ${i}`);
    process.exit(1);
  }
  const ng = report.items.filter((i) => !i.ok).length;
  const sec = ((performance.now() - started) / 1000).toFixed(1);
  const engines = opts.teavm ? 'JDK・teavm' : 'JDK のみ';
  console.log(
    `\ncontent-verify: ${report.items.length} 件中 OK ${report.items.length - ng}、NG ${ng}（${engines}、${sec}秒）`,
  );
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main();

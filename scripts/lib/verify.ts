// content-verify の部品: JDK と teavm-javac で RunJob を動かし、期待する落ち方と比べる（設計書 6-9）
import type { ErrorEntry } from '../../src/content/schema.ts';
import type { HarnessSources } from '../../src/domain/java/harness.ts';
import { assembleJob } from '../../src/runtime/java/core/assemble.ts';
import { buildRunResult, mapDiagnostics } from '../../src/runtime/java/core/result.ts';
import type { Diagnostic, RunJob, RunResult } from '../../src/runtime/java/JavaRunner.ts';
import type { ExpectDecl } from './content.ts';
import { loadHarness } from './harness-files.ts';
import { compileWithJdk, type JdkLang, runWithJdk } from './jdk.ts';
import { runTeavmIsolated } from './teavm-run.ts';

export type Engine = 'jdk' | 'teavm';
export const ENGINE_LABEL: Record<Engine, string> = { jdk: 'JDK', teavm: 'teavm' };

/** 1回の実行の上限（落ち方の宣言が timeout のものは、問題の timeoutMs で止める。設計書 6-9） */
export const RUN_CAP_MS = 10_000;

let harnessCache: Record<Engine, HarnessSources> | null = null;
function harnessFor(engine: Engine): HarnessSources {
  harnessCache ??= { jdk: loadHarness('jdk'), teavm: loadHarness('browser') };
  return harnessCache[engine];
}

export async function runOnEngine(
  engine: Engine,
  job: RunJob,
  options: { lang?: JdkLang; timeoutMs?: number } = {},
): Promise<RunResult> {
  const assembled = assembleJob(job, harnessFor(engine));
  const timeoutMs = options.timeoutMs ?? RUN_CAP_MS;
  if (engine === 'jdk') {
    const compiled = await compileWithJdk(assembled.files, options.lang ?? 'en');
    if (!compiled.ok) {
      return {
        kind: 'compile-error',
        diagnostics: mapDiagnostics(compiled.diagnostics, assembled, assembled.origins),
      };
    }
    try {
      return buildRunResult(await runWithJdk(compiled.dir, timeoutMs), timeoutMs);
    } finally {
      await compiled.cleanup();
    }
  }
  const r = await runTeavmIsolated({ files: assembled.files, timeoutMs });
  if (r.kind === 'compile-error') {
    return {
      kind: 'compile-error',
      diagnostics: mapDiagnostics(r.diagnostics, assembled, assembled.origins),
    };
  }
  if (r.kind === 'internal-error') return { kind: 'internal-error', message: r.message };
  return buildRunResult(r.run, timeoutMs);
}

// ---------------------------------------------------------------------------
// 結果の見方

export function firstError(diagnostics: Diagnostic[]): Diagnostic | null {
  return diagnostics.find((d) => d.severity === 'error') ?? null;
}

export function describe(result: RunResult): string {
  switch (result.kind) {
    case 'judged':
      return `判定 ${result.passed}/${result.total}`;
    case 'compile-error': {
      const e = firstError(result.diagnostics);
      return e
        ? `コンパイルエラー（${e.file}:${e.line} ${e.message.split('\n')[0]}）`
        : 'コンパイルエラー';
    }
    case 'timeout':
      return '時間切れ';
    case 'output-limit':
      return '出力の上限';
    case 'crash':
      return `実行時のエラー（${result.error.type}）`;
    case 'exited-early':
      return `途中で終了（終了コード ${result.code}）`;
    case 'internal-error':
      return `実行環境のエラー（${result.message.split('\n')[0]}）`;
    default:
      return result.kind;
  }
}

/** 全部の松明がともる（total ≥ 1、passed = total） */
export function checkAllPass(result: RunResult): string | null {
  if (result.kind !== 'judged') return `全部の松明がともらない（${describe(result)}）`;
  if (result.total < 1) return '判定のケース・テストが0件（total = 0）';
  if (result.passed !== result.total) {
    const failed = result.stages
      .flatMap((s) => [...s.cases, ...s.checks])
      .find((c) => c.ok === false);
    const name = failed ? `。最初の失敗「${failed.name}」` : '';
    return `全部の松明がともらない（${result.passed}/${result.total}${name}）`;
  }
  return null;
}

function errorTypes(result: RunResult): string[] {
  if (result.kind === 'crash') return [result.error.type];
  if (result.kind !== 'judged') return [];
  const types: string[] = [];
  if (result.asIs?.error) types.push(result.asIs.error.type);
  for (const s of result.stages) {
    for (const c of [...s.cases, ...s.checks]) if (c.error) types.push(c.error.type);
  }
  return types;
}

export function matchesDex(message: string, entry: ErrorEntry, lang: JdkLang): boolean {
  const patterns = (lang === 'ja' ? entry.match.javacJa : entry.match.javacEn) ?? [];
  const firstLine = message.split('\n')[0];
  return patterns.some((p) => new RegExp(p).test(firstLine));
}

export function describeDecl(decl: ExpectDecl): string {
  switch (decl.kind) {
    case 'compile':
      return decl.dex ? `compile ${decl.dex}` : 'compile';
    case 'exception':
      return `exception ${decl.type}`;
    default:
      return decl.kind;
  }
}

/**
 * 宣言した落ち方で落ちたか（設計書 6-9 の「落ち方の判定」）。合っていれば null、違えば理由。
 * compile の図鑑 ID の文言は、lang の文言（en: javacEn、ja: javacJa）で確かめる
 */
export function checkExpectation(
  decl: ExpectDecl,
  result: RunResult,
  errors: ErrorEntry[],
  lang: JdkLang = 'en',
): string | null {
  const got = describe(result);
  switch (decl.kind) {
    case 'test': {
      if (result.kind !== 'judged') return `test と宣言したが ${got}`;
      if (result.total < 1) return 'test と宣言したが、判定のケース・テストが0件';
      if (result.passed >= result.total) return `test と宣言したが、全部の松明がともった（${got}）`;
      const items = result.stages.flatMap((s) => [...s.cases, ...s.checks]);
      if (!items.some((c) => c.ok === false && c.error === null)) {
        return 'test と宣言したが、失敗がすべて例外（値・出力の不一致での失敗が無い）';
      }
      return null;
    }
    case 'exception': {
      const types = errorTypes(result);
      if (result.kind !== 'judged' && result.kind !== 'crash')
        return `exception と宣言したが ${got}`;
      if (!types.includes(decl.type)) {
        return `${decl.type} が起きない（${types.length > 0 ? [...new Set(types)].join('・') : got}）`;
      }
      return null;
    }
    case 'compile': {
      if (result.kind !== 'compile-error') return `compile と宣言したが ${got}`;
      if (!decl.dex) return null;
      const entry = errors.find((e) => e.id === decl.dex);
      if (!entry) return `図鑑 ID「${decl.dex}」が errors.yaml に無い`;
      const first = firstError(result.diagnostics);
      if (!first || !matchesDex(first.message, entry, lang)) {
        return `最初のエラー「${first?.message.split('\n')[0] ?? 'なし'}」が図鑑「${decl.dex}」（${lang}）に当たらない`;
      }
      return null;
    }
    case 'timeout':
      return result.kind === 'timeout' ? null : `timeout と宣言したが ${got}`;
  }
}

/** ケースごとの出力（段階0を含む）。JDK と teavm の一致を見るのに使う */
export function caseOutputs(result: RunResult): Map<string, string> {
  const map = new Map<string, string>();
  if (result.kind !== 'judged') return map;
  if (result.asIs) map.set('そのまま実行', result.asIs.actual);
  for (const s of result.stages)
    for (const c of s.cases) map.set(`ケース${c.index}「${c.name}」`, c.actual);
  return map;
}

export function compareOutputs(jdk: RunResult, teavm: RunResult): string | null {
  const a = caseOutputs(jdk);
  const b = caseOutputs(teavm);
  for (const [name, text] of a) {
    if (b.get(name) !== text) {
      return `${name} の出力が JDK と teavm で違う（JDK: ${JSON.stringify(text.slice(0, 80))}、teavm: ${JSON.stringify((b.get(name) ?? '').slice(0, 80))}）`;
    }
  }
  return null;
}

/** 既定の toString に見える文字列（Hero@1b6d3586）。設計書 6-9 */
export const DEFAULT_TO_STRING_RE = /\b[A-Z]\w*@[0-9a-f]{5,}\b/;

export function findDefaultToString(result: RunResult): string | null {
  for (const [name, text] of caseOutputs(result)) {
    const m = DEFAULT_TO_STRING_RE.exec(text);
    if (m)
      return `${name} の出力に既定の toString に見える「${m[0]}」がある（toString を上書きする）`;
  }
  return null;
}

/** 並べて動かす（同時に limit 個まで） */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

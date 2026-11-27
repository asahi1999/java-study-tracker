// 実行の結果（標準出力・標準エラー・終わり方）を、画面が使う RunResult にする（設計書 4-3・5-4）。
// ブラウザ（teavmRunner）と content-verify（JDK・teavm）の両方が使う。

import type { Assembled } from '../../../domain/java/harness.ts';
import {
  type CaseEvent,
  type CheckEvent,
  parseProtocol,
  summarize,
} from '../../../domain/java/protocol.ts';
import { toLearnerPosition } from '../../../domain/java/wrap.ts';
import type {
  CaseResult,
  CheckResult,
  Diagnostic,
  RunResult,
  RuntimeErrorInfo,
  StageResult,
} from '../JavaRunner.ts';
import type { CrashKind, RawDiagnostic } from './messages.ts';

export type RunEnd =
  | { kind: 'exit'; code: number }
  | { kind: 'timeout' }
  | { kind: 'limit' }
  | { kind: 'crash'; crash: CrashKind; message: string };

export type RawRun = {
  stdout: string;
  stderr: string;
  end: RunEnd;
  ms: number;
};

const PARTIAL_LINES = 200;

/** 途中までの出力（最後の200行） */
export function tailLines(text: string, count = PARTIAL_LINES): string {
  const lines = text.split('\n');
  const endsWithNewline = text.endsWith('\n');
  const body = endsWithNewline ? lines.slice(0, -1) : lines;
  if (body.length <= count) return text;
  return body.slice(-count).join('\n') + (endsWithNewline ? '\n' : '');
}

function toCase(e: CaseEvent): CaseResult {
  return {
    stage: e.stage,
    index: e.i,
    name: e.name,
    ok: e.ok,
    expected: e.expected ?? null,
    actual: e.actual ?? '',
    error: e.error
      ? { type: e.error.type, line: e.error.line, file: e.error.file, message: null }
      : null,
  };
}

function toCheck(e: CheckEvent): CheckResult {
  return {
    stage: e.stage,
    name: e.name,
    ok: e.ok,
    expected: e.expected ?? null,
    actual: e.actual ?? null,
    error: e.error
      ? { type: e.error.type, line: e.error.line, file: e.error.file, message: null }
      : null,
  };
}

const CRASH_TYPE: Record<CrashKind, string> = {
  'stack-overflow': 'java.lang.StackOverflowError',
  'out-of-memory': 'java.lang.OutOfMemoryError',
  unknown: 'unknown',
};

export function buildRunResult(raw: RawRun, timeoutMs: number): RunResult {
  const parsed = parseProtocol(raw.stderr);
  const summary = summarize(parsed.events);
  const stages: StageResult[] = summary.stages.map((s) => ({
    stage: s.stage,
    passed: s.passed,
    total: s.total,
    cases: s.cases.map(toCase),
    checks: s.checks.map(toCheck),
  }));
  const partialOutput = tailLines(raw.stdout);

  if (summary.done && raw.end.kind === 'exit') {
    const asIs = summary.asIs ? toCase(summary.asIs) : null;
    return {
      kind: 'judged',
      stages,
      passed: summary.done.passed,
      total: summary.done.total,
      asIs,
      displayOutput: asIs?.actual ?? '',
      stderr: parsed.text,
      ms: raw.ms,
    };
  }
  if (raw.end.kind === 'timeout') {
    const finished = new Set(
      parsed.events.filter((e) => e.t === 'stage').map((e) => (e as { stage: number }).stage),
    );
    return {
      kind: 'timeout',
      partialOutput,
      doneStages: stages.filter((s) => finished.has(s.stage)),
      timeoutMs,
    };
  }
  if (summary.limit || raw.end.kind === 'limit') return { kind: 'output-limit', partialOutput };
  if (raw.end.kind === 'crash') {
    const error: RuntimeErrorInfo = {
      type: CRASH_TYPE[raw.end.crash],
      line: null,
      file: null,
      message: raw.end.message,
    };
    return { kind: 'crash', error, partialOutput };
  }
  if (raw.end.code !== 0) {
    return {
      kind: 'crash',
      error: { type: 'exit-code', line: null, file: null, message: `終了コード ${raw.end.code}` },
      partialOutput,
    };
  }
  return { kind: 'exited-early', code: raw.end.code, partialOutput };
}

export type FileOrigins = Record<string, Diagnostic['origin']>;

/** コンパイルエラーの位置を、学習者のファイルでは外枠の分を戻す */
export function mapDiagnostics(
  raw: RawDiagnostic[],
  assembled: Pick<Assembled, 'wrapped'>,
  origins: FileOrigins,
): Diagnostic[] {
  return raw.map((d) => {
    const wrapped = assembled.wrapped[d.file];
    const pos =
      wrapped && d.line > 0 ? toLearnerPosition(wrapped, d.line, Math.max(1, d.column)) : null;
    return {
      file: d.file,
      line: pos?.line ?? d.line,
      column: pos ? (d.column > 0 ? pos.column : 0) : d.column,
      severity: d.severity,
      message: d.message,
      origin: origins[d.file] ?? 'harness',
    };
  });
}

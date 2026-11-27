// 実行の結果（RunResult）を、画面の表示と記録の形にする（純粋関数。設計書 4-7、05-visual-design.md 7-4〜7-6）
import type { GeneratedCase } from '@/content/schema';
import type { AttemptResult } from '@/db/v2/types';
import { isCleared, type RunResult } from '@/runtime/java/JavaRunner';

export type TorchItem = { name: string; lit: boolean };

/** 松明（テスト1件＝1本）。実行前とコンパイルエラーのときは教材のケースの名前で全部まだ */
export function torchesOf(result: RunResult | null, cases: GeneratedCase[]): TorchItem[] {
  const unlit = cases.map((c) => ({ name: c.name, lit: false }));
  if (!result) return unlit;
  const stages =
    result.kind === 'judged' ? result.stages : result.kind === 'timeout' ? result.doneStages : null;
  if (!stages) return unlit;
  const items: TorchItem[] = [];
  for (const s of stages) {
    if (s.stage < 1) continue;
    for (const c of s.cases) items.push({ name: c.name, lit: c.ok === true });
    for (const c of s.checks) items.push({ name: c.name, lit: c.ok });
  }
  // 時間切れで途中までのときは、残りのケースを「まだ」で足す
  for (let i = items.length; i < cases.length; i++) items.push({ name: cases[i].name, lit: false });
  return items;
}

export function torchSummary(items: TorchItem[], compileError: boolean): string {
  if (compileError) return 'コンパイルが通ると松明に火が入ります';
  const lit = items.filter((t) => t.lit).length;
  if (items.length > 0 && lit === items.length) return `${items.length} 本の松明が全部ともった`;
  return `${lit} / ${items.length} 本ともった`;
}

/** 記録（attempts）の形 */
export function attemptOf(
  result: RunResult,
  caseCount: number,
): { result: AttemptResult; passed: number; total: number } | null {
  switch (result.kind) {
    case 'judged': {
      if (isCleared(result)) return { result: 'pass', passed: result.passed, total: result.total };
      const errored = result.stages.some(
        (s) => s.cases.some((c) => c.error) || s.checks.some((c) => c.error),
      );
      return {
        result: errored ? 'runtime-error' : 'fail',
        passed: result.passed,
        total: result.total,
      };
    }
    case 'compile-error':
    case 'precheck':
      return { result: 'compile-error', passed: 0, total: caseCount };
    case 'timeout':
      return { result: 'timeout', passed: 0, total: caseCount };
    case 'output-limit':
      return { result: 'output-limit', passed: 0, total: caseCount };
    case 'crash':
      return { result: 'crash', passed: 0, total: caseCount };
    case 'exited-early':
      return { result: 'runtime-error', passed: 0, total: caseCount };
    case 'internal-error':
      return { result: 'internal-error', passed: 0, total: caseCount };
    case 'unsupported':
    case 'cancelled':
      return null;
  }
}

/** 「出力」欄に出す文字（そのまま実行の出力。止まったときは途中まで） */
export function outputOf(result: RunResult | null): string | null {
  if (!result) return null;
  switch (result.kind) {
    case 'judged':
      return result.displayOutput;
    case 'timeout':
    case 'output-limit':
    case 'crash':
    case 'exited-early':
      return result.partialOutput;
    default:
      return null;
  }
}

export type RunStatusText = { text: string; tone: 'moss' | 'ember' | 'dim' };

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`;

/** 実行ボタンの横の1行（状態は必ず文字で書く。05-visual-design.md 7-4） */
export function runStatusText(result: RunResult | null, elapsedMs?: number): RunStatusText | null {
  if (!result) return null;
  switch (result.kind) {
    case 'judged':
      // elapsedMs は押してから結果が出るまで（コンパイルを含む）。無ければ実行だけの時間
      return { text: `コンパイル OK ・ 実行 ${seconds(elapsedMs ?? result.ms)}`, tone: 'moss' };
    case 'compile-error': {
      const first = result.diagnostics.find((d) => d.origin === 'learner') ?? result.diagnostics[0];
      const where = first && first.origin === 'learner' ? `（${first.line}行目）` : '';
      return { text: `コンパイルエラー ${result.diagnostics.length}件${where}`, tone: 'ember' };
    }
    case 'precheck':
      return { text: `実行の前に止めました（${result.line}行目）`, tone: 'ember' };
    case 'timeout':
      return { text: `時間切れ（${seconds(result.timeoutMs)}）`, tone: 'dim' };
    case 'output-limit':
      return { text: '出力が多すぎるので止めました', tone: 'dim' };
    case 'crash':
      return { text: '実行中にエラー', tone: 'dim' };
    case 'exited-early':
      return { text: '途中で終了しました', tone: 'dim' };
    case 'internal-error':
      return { text: 'Java の実行環境でエラー', tone: 'dim' };
    case 'unsupported':
      return { text: 'このブラウザでは Java を動かせません', tone: 'dim' };
    case 'cancelled':
      return null;
  }
}

/** 読み上げ（aria-live）の1文（N-A11Y-4） */
export function liveMessage(result: RunResult, torches: TorchItem[]): string {
  if (result.kind === 'judged') {
    const lit = torches.filter((t) => t.lit).length;
    return `テスト ${torches.length} 本中 ${lit} 本が通りました`;
  }
  return runStatusText(result)?.text ?? '';
}

/** 例外の型名の短い形（java.lang.ArithmeticException → ArithmeticException） */
export function simpleTypeName(type: string): string {
  return type.split('.').pop() ?? type;
}

/** 止まった理由の説明（設計書 4-7。フェーズ1は原文と行だけ） */
export function stopReason(result: RunResult): string | null {
  switch (result.kind) {
    case 'timeout':
      return `${Math.round(result.timeoutMs / 1000)}秒たっても終わらなかった（無限ループかも）`;
    case 'output-limit':
      return '出力が多すぎる（無限ループかも）';
    case 'crash': {
      const t = result.error.type;
      if (t === 'java.lang.StackOverflowError') return 'StackOverflowError（再帰が深すぎる）';
      if (t === 'java.lang.OutOfMemoryError') return 'メモリが足りない（配列が大きすぎるかも）';
      const line = result.error.line ? ` ${result.error.line}行目` : '';
      return `${simpleTypeName(t)}${line}${result.error.message ? `（${result.error.message}）` : ''}`;
    }
    case 'exited-early':
      return '途中で終了した（System.exit）';
    case 'precheck':
      return result.message;
    case 'internal-error':
      return `Java の実行環境でエラー。もう一度押してください（${result.message}）`;
    case 'unsupported':
      return 'このブラウザでは Java を動かせません。Chrome で開いてください';
    default:
      return null;
  }
}

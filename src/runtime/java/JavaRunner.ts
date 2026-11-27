// 画面が使う Java 実行の口（設計書 4-3）。本物は teavmRunner、画面のテストは fakeRunner に差し替える。
// この型のファイルは DOM に依存しない（scripts/ からも型として読む）

import type { JqStage, SourceFile, SourceKind } from '../../domain/java/types.ts';

export type { JqCase, JqStage, SourceFile, SourceKind } from '../../domain/java/types.ts';

export type RunnerStatus = 'idle' | 'downloading' | 'ready' | 'unsupported' | 'failed';

export interface JavaRunner {
  readonly status: RunnerStatus;
  /** 状態が変わるたびに呼ぶ。progress は downloading のときの 0〜1 */
  subscribe(listener: (s: RunnerStatus, progress?: number) => void): () => void;
  /** 先読み。何度呼んでもよい */
  prepare(): Promise<void>;
  run(job: RunJob, onLive?: (chunk: LiveChunk) => void): Promise<RunResult>;
  /** 実行中のものを止める（その run は cancelled で終わる） */
  cancel(): void;
}

export type RunJob = {
  stepId: string; // 判定の行に入れる（5-4）
  rev: number;
  source: SourceKind;
  learnerFiles: SourceFile[]; // 編集できるファイル
  givenFiles: SourceFile[]; // 配る完成済みファイル
  testsJava: string | null; // Tests.java（中のクラス名は JqProblemTests。フェーズ2）
  stdin: string; // 「そのまま実行」（段階0）に渡す入力
  stages: JqStage[]; // JqCases の元
  timeoutMs: number;
};

/** 実行中の出力（画面に流す。50ms ごとにまとめて届く） */
export type LiveChunk = { stream: 'stdout' | 'stderr'; text: string };

export type Diagnostic = {
  file: string;
  line: number; // 学習者のファイルでは、外枠の分を戻した行・列（1始まり）
  column: number;
  severity: 'error' | 'warning';
  message: string; // 英語の原文（teavm-javac）
  /** どのファイルのエラーか。learner = 編集できるファイル、given = 配るファイル、tests = Tests.java、harness = 判定のクラス */
  origin: 'learner' | 'given' | 'tests' | 'harness';
};

export type RuntimeErrorInfo = {
  type: string; // 例外の完全な型名（java.lang.ArithmeticException）。実行環境のエラーは java.lang.StackOverflowError など
  line: number | null; // 学習者のファイルの行。取れなければ null
  file: string | null;
  message: string | null; // 実行環境のエラーの原文（JS の RangeError の文言など）。Java の例外のメッセージは入れない
};

export type CaseResult = {
  stage: number;
  index: number; // 全段階を通した1始まりの番号（段階0は0）
  name: string;
  ok: boolean | null; // null = 期待する出力を持たない（そのまま実行）
  expected: string | null;
  actual: string;
  error: RuntimeErrorInfo | null;
};

export type CheckResult = {
  stage: number;
  name: string;
  ok: boolean;
  expected: string | null;
  actual: string | null;
  error: RuntimeErrorInfo | null;
};

export type StageResult = {
  stage: number;
  passed: number;
  total: number;
  cases: CaseResult[];
  checks: CheckResult[];
};

export type RunResult =
  | {
      kind: 'judged';
      stages: StageResult[];
      passed: number;
      total: number;
      asIs: CaseResult | null; // 段階0（そのまま実行）
      displayOutput: string; // 「出力」欄とタイルに出す（段階0の標準出力）
      stderr: string; // 判定の行を除いた標準エラー
      ms: number; // 実行にかかった時間（コンパイルを除く）
    }
  | { kind: 'compile-error'; diagnostics: Diagnostic[] }
  | { kind: 'timeout'; partialOutput: string; doneStages: StageResult[]; timeoutMs: number }
  | { kind: 'output-limit'; partialOutput: string }
  | { kind: 'crash'; error: RuntimeErrorInfo; partialOutput: string }
  | { kind: 'exited-early'; code: number; partialOutput: string } // 学習者が System.exit
  | { kind: 'precheck'; message: string; line: number } // 実行の前に止めた（4-5 の事前の検査）
  | { kind: 'unsupported' }
  | { kind: 'cancelled' } // cancel() か、次の run で止めた
  | { kind: 'internal-error'; message: string };

/** judged のうち、合格は「done があり、total ≥ 1 で、passed = total」（5-4） */
export function isCleared(result: RunResult): boolean {
  return result.kind === 'judged' && result.total >= 1 && result.passed === result.total;
}

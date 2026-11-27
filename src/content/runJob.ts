// 教材のステップ（chNN.json）と学習者のコードから、JavaRunner に渡す RunJob を作る

import type { RunJob } from '../runtime/java/JavaRunner.ts';
import type { StepContent } from './schema.ts';

/** 学習者のファイルの名前（画面では Main.java。設計書 6-4） */
export const LEARNER_FILE = 'Main.java';

/**
 * 書く問題（fill・fix・implement・draw）の実行。judge のケースを段階1にする
 * （段階を分けるのは手元課題だけ。設計書 6-6）
 */
export function buildRunJob(step: StepContent, code: string): RunJob {
  if (!step.source) throw new Error(`${step.id}: source が無い問題は実行できない`);
  const cases = step.judge?.cases ?? [];
  return {
    stepId: step.id,
    rev: step.rev,
    source: step.source,
    learnerFiles: [{ path: LEARNER_FILE, content: code }],
    givenFiles: step.given,
    testsJava: step.judge && step.judge.mode !== 'output' ? step.tests : null,
    stdin: step.stdin,
    stages: cases.length > 0 ? [{ n: 1, cases }] : [],
    timeoutMs: step.timeoutMs,
  };
}

/** そのまま実行するだけ（説明カードの例・予想のコード）。ケースは持たない */
export function buildPlainRunJob(step: StepContent, code: string): RunJob {
  if (!step.source) throw new Error(`${step.id}: source が無い問題は実行できない`);
  return {
    stepId: step.id,
    rev: step.rev,
    source: step.source,
    learnerFiles: [{ path: LEARNER_FILE, content: code }],
    givenFiles: [],
    testsJava: null,
    stdin: step.stdin,
    stages: [],
    timeoutMs: step.timeoutMs,
  };
}

// progress・attempts の読み書き（設計書 3-2・9-1）。クリアと試行の記録は1つのトランザクションで書く
import type { StepSummary } from '@/content/schema';
import { pointsFor, progressKind } from '@/domain/progress/points';

import { v2db } from './database';
import type { Attempt, AttemptResult, Progress } from './types';

export function chapterIdOf(step: Pick<StepSummary, 'chapter'>): string {
  return `ch${String(step.chapter).padStart(2, '0')}`;
}

export function emptyProgress(step: Pick<StepSummary, 'id' | 'chapter' | 'type'>): Progress {
  return {
    stepId: step.id,
    chapterId: chapterIdOf(step),
    kind: progressKind(step.type),
    status: 'new',
    firstOpenedAt: null,
    lastOpenedAt: null,
    clearedAt: null,
    clearedRev: null,
    attemptCount: 0,
    maxHint: 0,
    activeSeconds: 0,
    points: 0,
    showcase: null,
    localStartedAt: null,
  };
}

type StepRef = Pick<StepSummary, 'id' | 'chapter' | 'type' | 'rev'>;

async function update(step: StepRef, change: (p: Progress) => Progress): Promise<Progress> {
  return v2db.transaction('rw', v2db.progress, async () => {
    const current = (await v2db.progress.get(step.id)) ?? emptyProgress(step);
    const next = change(current);
    await v2db.progress.put(next);
    return next;
  });
}

/** 開いた（status は変えない。のぞいただけで「次」が動かないように。9-1） */
export function markOpened(step: StepRef, now: string): Promise<Progress> {
  return update(step, (p) => ({
    ...p,
    firstOpenedAt: p.firstOpenedAt ?? now,
    lastOpenedAt: now,
  }));
}

/** コードを変えた（new → trying） */
export function markTrying(step: StepRef): Promise<Progress> {
  return update(step, (p) => (p.status === 'new' ? { ...p, status: 'trying' } : p));
}

/** ヒントを開いた（使った最高の段を残す。F-STEP-8） */
export function recordHint(step: StepRef, level: 1 | 2 | 3): Promise<Progress> {
  return update(step, (p) => ({
    ...p,
    maxHint: Math.max(p.maxHint, level) as Progress['maxHint'],
  }));
}

function cleared(p: Progress, step: StepRef, now: string): Progress {
  if (p.status === 'cleared') return p;
  return {
    ...p,
    status: 'cleared',
    clearedAt: now,
    clearedRev: step.rev,
    points: pointsFor(step.type),
  };
}

/** 説明カードの「わかった」（試行は残さない） */
export function markCleared(step: StepRef, now: string): Promise<Progress> {
  return update(step, (p) => cleared(p, step, now));
}

export type AttemptInput = {
  result: AttemptResult;
  passed: number;
  total: number;
  where: Attempt['where'];
  durationMs: number | null;
  errorIds?: string[];
};

/** 実行・答えの記録。合格なら同じトランザクションでクリアにする */
export async function recordAttempt(
  step: StepRef,
  input: AttemptInput,
  now: string,
): Promise<Progress> {
  return v2db.transaction('rw', v2db.progress, v2db.attempts, async () => {
    await v2db.attempts.add({
      id: crypto.randomUUID(),
      stepId: step.id,
      at: now,
      rev: step.rev,
      result: input.result,
      passed: input.passed,
      total: input.total,
      where: input.where,
      errorIds: input.errorIds ?? [],
      durationMs: input.durationMs,
    });
    const current = (await v2db.progress.get(step.id)) ?? emptyProgress(step);
    let next: Progress = {
      ...current,
      status: current.status === 'new' ? 'trying' : current.status,
      attemptCount: current.attemptCount + 1,
    };
    if (input.result === 'pass') next = cleared(next, step, now);
    await v2db.progress.put(next);
    return next;
  });
}

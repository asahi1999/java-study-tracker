// 次の1ステップの選び方（設計書 9-1）。React・Dexie に依存しない
import type { GeneratedCourse, StepSummary } from '../../content/schema.ts';

/** 次の1ステップを選ぶのに使う progress の項目だけ */
export type ProgressLike = {
  stepId: string;
  status: 'new' | 'trying' | 'cleared';
  lastOpenedAt: string | null;
  clearedAt: string | null;
};

export type NextStep =
  | { kind: 'step'; step: StepSummary; reason: 'resume' | 'next' | 'first' }
  | { kind: 'done' } // 公開済みのステップを全部クリアした（F-HOME-6）
  | { kind: 'empty' }; // 公開済みのステップが1つも無い

/** コースの並び（章 → content-build が並べた順） */
export function courseSteps(course: GeneratedCourse): StepSummary[] {
  return course.chapters.flatMap((ch) => ch.steps);
}

export function chooseNextStep(steps: StepSummary[], progress: ProgressLike[]): NextStep {
  if (steps.length === 0) return { kind: 'empty' };
  const inCourse = new Set(steps.map((s) => s.id));
  // 今のコースに無い ID の記録は飛ばす（設計書 3-2）
  const byId = new Map(progress.filter((p) => inCourse.has(p.stepId)).map((p) => [p.stepId, p]));
  const isCleared = (id: string) => byId.get(id)?.status === 'cleared';

  let lastCleared: ProgressLike | null = null;
  for (const p of byId.values()) {
    if (
      p.status === 'cleared' &&
      p.clearedAt &&
      (!lastCleared || p.clearedAt > (lastCleared.clearedAt ?? ''))
    ) {
      lastCleared = p;
    }
  }

  // 1. 書きかけ: trying のうち lastOpenedAt が一番新しいもの。そのあとに別のステップをクリアしていれば対象にしない
  let resume: ProgressLike | null = null;
  for (const p of byId.values()) {
    if (p.status !== 'trying' || !p.lastOpenedAt) continue;
    if (!resume || p.lastOpenedAt > (resume.lastOpenedAt ?? '')) resume = p;
  }
  if (resume && !(lastCleared?.clearedAt && lastCleared.clearedAt > (resume.lastOpenedAt ?? ''))) {
    const step = steps.find((s) => s.id === resume.stepId);
    if (step) return { kind: 'step', step, reason: 'resume' };
  }

  // 2. 先へ: 最後にクリアしたステップの次から、最初の cleared でないもの。最後まで無ければ頭から
  const start = lastCleared ? steps.findIndex((s) => s.id === lastCleared.stepId) + 1 : 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[(start + i) % steps.length];
    if (!isCleared(step.id)) return { kind: 'step', step, reason: lastCleared ? 'next' : 'first' };
  }

  // 3. 全部終わった
  return { kind: 'done' };
}

/** ステップの場所（第N章 ／ 部品 N-P ／ ステップ k / n。05-visual-design.md 7-3） */
export type StepPlace = {
  chapter: GeneratedCourse['chapters'][number];
  partTitle: string | null;
  partSteps: StepSummary[]; // 同じ部品のステップ（並び順）
  indexInPart: number; // 0始まり
};

export function placeOf(course: GeneratedCourse, stepId: string): StepPlace | null {
  for (const chapter of course.chapters) {
    const step = chapter.steps.find((s) => s.id === stepId);
    if (!step) continue;
    const partSteps = chapter.steps.filter((s) => s.part === step.part);
    return {
      chapter,
      partTitle: chapter.parts.find((p) => p.n === step.part)?.title ?? null,
      partSteps,
      indexInPart: partSteps.findIndex((s) => s.id === stepId),
    };
  }
  return null;
}

/** 「次のステップへ」の行き先: 今のステップのあとから順に、最初の cleared でないもの（今のものは除く） */
export function stepAfter(
  steps: StepSummary[],
  progress: ProgressLike[],
  currentId: string,
): StepSummary | null {
  const cleared = new Set(progress.filter((p) => p.status === 'cleared').map((p) => p.stepId));
  const start = steps.findIndex((s) => s.id === currentId) + 1;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[(start + i) % steps.length];
    if (step.id !== currentId && !cleared.has(step.id)) return step;
  }
  return null;
}

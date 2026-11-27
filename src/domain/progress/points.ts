// クリアで得る点（設計書 9-2）。レベルの計算はフェーズ4b。フェーズ1は progress.points に残すだけ
import type { StepType } from '../../content/schema.ts';

const POINTS: Record<StepType, number> = {
  card: 1,
  predict: 2,
  quiz: 2,
  parsons: 2,
  fill: 3,
  fix: 3,
  implement: 4,
  draw: 4,
};

export function pointsFor(type: StepType): number {
  return POINTS[type];
}

/** progress.kind（説明カードとそれ以外） */
export function progressKind(type: StepType): 'card' | 'problem' {
  return type === 'card' ? 'card' : 'problem';
}

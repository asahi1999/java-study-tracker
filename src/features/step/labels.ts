import type { StepType } from '@/content/schema';

/** 種類の表示名（小ラベル・チップ） */
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  card: '説明',
  predict: '予想',
  quiz: 'クイズ',
  fill: '穴埋め',
  fix: '修理',
  implement: '実装',
  draw: '絵',
  parsons: '並べ替え',
};

/** 'ch04' + part 5 → '4-5' */
export function partLabel(chapter: number, part: number): string {
  return `${chapter}-${part}`;
}

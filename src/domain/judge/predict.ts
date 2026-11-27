import { normalizeOutput } from '../java/text.ts';

// 予想問題の答えの比べ方（F-STEP-2）。全角・半角を NFKC でそろえ、行末の空白と最後の空行を無視する

export function normalizePredict(s: string): string {
  return normalizeOutput(s.normalize('NFKC'));
}

export function samePredict(expected: string, answer: string): boolean {
  return normalizePredict(expected) === normalizePredict(answer);
}

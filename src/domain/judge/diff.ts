// 期待と実際の行ごとの差分（F-STEP-7、05-visual-design.md 7-5）。
// 比べる前に、判定と同じ正規化（行末の空白・最後の空行）をそろえる
import { normalizeOutput } from '../java/text.ts';

export type DiffSegment = { text: string; diff: boolean };

export type DiffLine = {
  line: number; // 1始まり
  same: boolean;
  expected: DiffSegment[] | null; // その行が無ければ null
  actual: DiffSegment[] | null;
};

/** 文字ごとに比べ、違う文字の並びを1つの塊にする */
function segments(text: string, other: string): DiffSegment[] {
  const a = [...text];
  const b = [...other];
  const out: DiffSegment[] = [];
  a.forEach((ch, i) => {
    const diff = ch !== b[i];
    const last = out[out.length - 1];
    if (last && last.diff === diff) last.text += ch;
    else out.push({ text: ch, diff });
  });
  return out;
}

export function diffLines(expected: string, actual: string): DiffLine[] {
  const e = normalizeOutput(expected).split('\n');
  const a = normalizeOutput(actual).split('\n');
  if (e.length === 1 && e[0] === '') e.length = 0;
  if (a.length === 1 && a[0] === '') a.length = 0;
  const n = Math.max(e.length, a.length);
  const lines: DiffLine[] = [];
  for (let i = 0; i < n; i++) {
    const ex = e[i];
    const ac = a[i];
    lines.push({
      line: i + 1,
      same: ex === ac,
      expected: ex === undefined ? null : segments(ex, ac ?? ''),
      actual: ac === undefined ? null : segments(ac, ex ?? ''),
    });
  }
  return lines;
}

/** 最初に違う行（無ければ null） */
export function firstDifference(lines: DiffLine[]): number | null {
  return lines.find((l) => !l.same)?.line ?? null;
}

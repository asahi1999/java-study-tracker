import { maskCommentsAndStrings } from './strip.ts';

// 事前の検査（設計書 4-5、F-RUN-8）。source: compact の問題で、学習者のコードの一番外に class の宣言、
// または static void main(String[] があれば、包む前に止める（チャットからもらった
// public class Main { ... } を貼ったときに、意味の分からないコンパイルエラーを出さないため）

export const PRECHECK_MESSAGE =
  'この問題は `void main()` の形で書きます。`public class Main { ... }` の外側を外して、中身だけを書いてください';

export type PrecheckResult =
  { ok: true } | { ok: false; reason: 'top-level-class' | 'static-main'; line: number };

export function precheckCompact(src: string): PrecheckResult {
  const masked = maskCommentsAndStrings(src);
  const staticMain =
    /\bstatic\s+(?:final\s+)?void\s+main\s*\(\s*(?:final\s+)?String\s*(?:\[\s*\]|\.\.\.)/.exec(
      masked,
    );
  let depth = 0;
  let line = 1;
  const classRe = /^class\s+[A-Za-z_$]/;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '\n') line++;
    else if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === 'c' && (i === 0 || !/[\w$]/.test(masked[i - 1]))) {
      if (classRe.test(masked.slice(i, i + 64)))
        return { ok: false, reason: 'top-level-class', line };
    }
  }
  if (staticMain) {
    const before = masked.slice(0, staticMain.index);
    return { ok: false, reason: 'static-main', line: before.split('\n').length };
  }
  return { ok: true };
}

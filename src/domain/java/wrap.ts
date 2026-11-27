import { maskCommentsAndStrings } from './strip.ts';

// コンパクトソース（void main() の形）を、判定のクラスから呼べる通常のクラスに包む（設計書 4-5）。
//  1. 1行目の先頭に「import module java.base; 」を足す（コンパクトソースが暗黙に持つ import と同じ）
//  2. 学習者の最後の import 文の ; の直後に、改行せずに「 final class Main {」を足す。
//     import が無ければ、1. で足した文の後ろ（1行目の頭）に「final class Main { 」を足す
//  3. 末尾に改行と } を足す
// 行番号は変わらない。列は、足した文字の分だけずれるので toLearnerPosition で戻す。

export const WRAP_IMPORT = 'import module java.base; ';
export const WRAP_CLASS_AFTER_IMPORT = ' final class Main {';
export const WRAP_CLASS_AT_START = 'final class Main { ';

export type Insertion = {
  line: number; // 1始まり
  column: number; // 1始まり。元のソースのこの列の前に足した
  length: number;
};

export type WrappedSource = {
  source: string;
  insertions: Insertion[]; // 同じ行では列の小さい順
};

/** 最後の import 文の ; の位置（0始まりの文字位置）。無ければ -1 */
export function findLastImportEnd(src: string): number {
  const masked = maskCommentsAndStrings(src);
  const re = /(^|[^\w$.])import\s[^;]*;/g;
  let last = -1;
  for (let m = re.exec(masked); m !== null; m = re.exec(masked)) {
    last = m.index + m[0].length - 1;
  }
  return last;
}

function lineAndColumn(src: string, index: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index; i++) {
    if (src[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: index - lineStart + 1 };
}

export function wrapCompact(src: string): WrappedSource {
  const end = findLastImportEnd(src);
  if (end < 0) {
    const prefix = WRAP_IMPORT + WRAP_CLASS_AT_START;
    return {
      source: `${prefix}${src}\n}`,
      insertions: [{ line: 1, column: 1, length: prefix.length }],
    };
  }
  const pos = lineAndColumn(src, end + 1);
  const insertions: Insertion[] = [{ line: 1, column: 1, length: WRAP_IMPORT.length }];
  insertions.push({ line: pos.line, column: pos.column, length: WRAP_CLASS_AFTER_IMPORT.length });
  const source = `${WRAP_IMPORT}${src.slice(0, end + 1)}${WRAP_CLASS_AFTER_IMPORT}${src.slice(end + 1)}\n}`;
  return { source, insertions };
}

/**
 * 包んだあとのソースの位置（行・列とも1始まり）を、元のソースの位置に戻す。
 * 足した文字の上を指していたら、足した位置（元のソースのその列）にする。
 * 行は変わらない。末尾に足した } の行は、元のソースの最後の行の次になる。
 */
export function toLearnerPosition(
  wrapped: WrappedSource,
  line: number,
  column: number,
): { line: number; column: number } {
  let col = column;
  let shift = 0;
  for (const ins of wrapped.insertions) {
    if (ins.line !== line) continue;
    const start = ins.column + shift; // 包んだあとの列
    if (col >= start + ins.length) {
      shift += ins.length;
    } else if (col >= start) {
      return { line, column: ins.column };
    }
  }
  col -= shift;
  return { line, column: Math.max(1, col) };
}

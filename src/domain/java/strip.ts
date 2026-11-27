// Java のソースから、コメントと文字列（文字列リテラル・テキストブロック・文字リテラル）の中身を
// 空白に置き換える。長さと改行の位置は変えない（位置をそのまま元のソースに当てられるように）。
// 外枠（wrap.ts）・事前の検査（precheck.ts）・使ってよい文法の検査（6-10）で使う。
// 文字列は引用符を残し、中身だけを空白にする（"abc" → "   "）。

export function maskCommentsAndStrings(src: string): string {
  const out: string[] = [];
  let i = 0;
  const n = src.length;
  const blank = (ch: string) => (ch === '\n' || ch === '\r' ? ch : ' ');

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n' && src[i] !== '\r') {
        out.push(' ');
        i++;
      }
    } else if (c === '/' && next === '*') {
      out.push('  ');
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out.push(blank(src[i]));
        i++;
      }
      if (i < n) {
        out.push('  ');
        i += 2;
      }
    } else if (c === '"' && src.startsWith('"""', i)) {
      out.push('"""');
      i += 3;
      while (i < n && !src.startsWith('"""', i)) {
        if (src[i] === '\\' && i + 1 < n) {
          out.push(' ', blank(src[i + 1]));
          i += 2;
        } else {
          out.push(blank(src[i]));
          i++;
        }
      }
      if (i < n) {
        out.push('"""');
        i += 3;
      }
    } else if (c === '"' || c === "'") {
      out.push(c);
      i++;
      while (i < n && src[i] !== c && src[i] !== '\n' && src[i] !== '\r') {
        if (src[i] === '\\' && i + 1 < n && src[i + 1] !== '\n' && src[i + 1] !== '\r') {
          out.push('  ');
          i += 2;
        } else {
          out.push(' ');
          i++;
        }
      }
      if (i < n && src[i] === c) {
        out.push(c);
        i++;
      }
    } else {
      out.push(c);
      i++;
    }
  }
  return out.join('');
}

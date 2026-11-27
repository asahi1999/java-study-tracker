import { describe, expect, it } from 'vitest';

import { maskCommentsAndStrings } from './strip.ts';

describe('maskCommentsAndStrings', () => {
  it('長さと改行の位置を変えない', () => {
    const src = 'a // c\n/* x\ny */ "s\\"t" \'q\' """\nblock\n"""';
    const masked = maskCommentsAndStrings(src);
    expect(masked.length).toBe(src.length);
    expect([...masked].map((c, i) => (c === '\n' ? i : -1)).filter((i) => i >= 0)).toEqual(
      [...src].map((c, i) => (c === '\n' ? i : -1)).filter((i) => i >= 0),
    );
  });

  it('コメントを空白にする', () => {
    expect(maskCommentsAndStrings('x // import y;')).toBe('x' + ' '.repeat(13));
    expect(maskCommentsAndStrings('a /* class */ b')).toBe('a' + ' '.repeat(13) + 'b');
  });

  it('文字列は引用符を残して中身を空白にする', () => {
    expect(maskCommentsAndStrings('s = "class A";')).toBe('s = "       ";');
    expect(maskCommentsAndStrings("c = '\"';")).toBe("c = ' ';");
    expect(maskCommentsAndStrings('s = "a\\"b";')).toBe('s = "    ";');
  });

  it('テキストブロックの中身を空白にする', () => {
    expect(maskCommentsAndStrings('"""\nclass X\n"""')).toBe('"""\n       \n"""');
  });

  it('閉じていないコメント・文字列でも止まる', () => {
    expect(maskCommentsAndStrings('/* x')).toBe('    ');
    expect(maskCommentsAndStrings('"abc\nd')).toBe('"   \nd');
  });
});

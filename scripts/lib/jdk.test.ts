import { describe, expect, it } from 'vitest';

import { parseJavacOutput } from './jdk.ts';

describe('parseJavacOutput', () => {
  it('行・^ の列・詳しい説明を読む', () => {
    const text = [
      "/tmp/x/src/Main.java:3: error: ';' expected",
      '    System.out.println("a")',
      '                           ^',
      '/tmp/x/src/Main.java:4: error: cannot find symbol',
      '    Lst.of(1);',
      '    ^',
      '  symbol:   variable Lst',
      '  location: class Main',
      '2 errors',
    ].join('\n');
    expect(parseJavacOutput(text)).toEqual([
      { file: 'Main.java', line: 3, column: 28, severity: 'error', message: "';' expected" },
      {
        file: 'Main.java',
        line: 4,
        column: 5,
        severity: 'error',
        message: 'cannot find symbol\n  symbol:   variable Lst\n  location: class Main',
      },
    ]);
  });

  it('日本語の JDK の文言も読む', () => {
    const text = "Main.java:2: エラー: ';'がありません\n    x\n     ^\nエラー1個\n";
    expect(parseJavacOutput(text)).toEqual([
      { file: 'Main.java', line: 2, column: 6, severity: 'error', message: "';'がありません" },
    ]);
  });
});

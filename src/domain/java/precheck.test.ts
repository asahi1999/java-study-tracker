import { describe, expect, it } from 'vitest';

import { precheckCompact } from './precheck.ts';

describe('precheckCompact', () => {
  it('void main() の形は通す', () => {
    expect(precheckCompact('void main() {\n    System.out.println("class A");\n}\n')).toEqual({
      ok: true,
    });
  });

  it('一番外の class を止める', () => {
    const src =
      '// 貼った\npublic class Main {\n    public static void main(String[] args) {}\n}\n';
    expect(precheckCompact(src)).toEqual({ ok: false, reason: 'top-level-class', line: 2 });
  });

  it('static void main(String[] を止める', () => {
    const src = 'void helper() {}\n\nstatic void main(String[] args) {\n}\n';
    expect(precheckCompact(src)).toEqual({ ok: false, reason: 'static-main', line: 3 });
  });

  it('可変長引数の main も止める', () => {
    expect(precheckCompact('public static void main(String... a) {}')).toMatchObject({ ok: false });
  });

  it('コメント・文字列の中の class と main は無視する', () => {
    const src =
      '/* public class Main { */\nvoid main() {\n    String s = "static void main(String[] a)";\n}\n';
    expect(precheckCompact(src)).toEqual({ ok: true });
  });

  it('メソッドの中の class（ローカルクラス）は止めない', () => {
    expect(precheckCompact('void main() {\n    class Pos {}\n}\n')).toEqual({ ok: true });
  });

  it('classic のような名前の識別子は止めない', () => {
    expect(precheckCompact('int classic = 1;\nvoid main() {}')).toEqual({ ok: true });
  });
});

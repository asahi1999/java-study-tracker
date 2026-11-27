import { describe, expect, it } from 'vitest';

import { createOutputBuffer, type Stream } from './output.ts';

function collect(options: { maxChars?: number; maxLines?: number; flushMs?: number } = {}) {
  let time = 0;
  const flushed: [Stream, string][] = [];
  let limits = 0;
  const buffer = createOutputBuffer({
    ...options,
    now: () => time,
    onFlush: (stream, text) => flushed.push([stream, text]),
    onLimit: () => limits++,
  });
  const put = (stream: Stream, text: string) => {
    for (const ch of text) for (let i = 0; i < ch.length; i++) buffer.put(stream, ch.charCodeAt(i));
  };
  return {
    buffer,
    put,
    flushed,
    limits: () => limits,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('createOutputBuffer', () => {
  it('行の終わりで送る（1文字ずつは送らない）', () => {
    const c = collect();
    c.put('stdout', 'ab');
    expect(c.flushed).toEqual([]);
    c.put('stdout', 'c\n');
    expect(c.flushed).toEqual([['stdout', 'abc\n']]);
  });

  it('50ms たったら行の途中でも送る', () => {
    const c = collect();
    c.put('stdout', 'a');
    c.advance(60);
    c.put('stdout', 'b');
    expect(c.flushed).toEqual([['stdout', 'ab']]);
  });

  it('日本語と絵文字（サロゲートペア）をそのまま組み立てる', () => {
    const c = collect();
    c.put('stdout', '勇者😀\n');
    expect(c.flushed).toEqual([['stdout', '勇者😀\n']]);
  });

  it('行の数の上限を超えたら limit を1回だけ知らせ、以後は捨てる', () => {
    const c = collect({ maxLines: 3, maxChars: 1000 });
    c.put('stdout', '1\n2\n3\n4\n5\n');
    expect(c.limits()).toBe(1);
    expect(c.buffer.limited).toBe(true);
    expect(c.buffer.put('stdout', 65)).toBe(false);
    expect(c.flushed.map(([, t]) => t).join('')).toBe('1\n2\n3\n4\n');
  });

  it('文字数の上限（サロゲートペアは1文字）', () => {
    const c = collect({ maxChars: 3, maxLines: 100 });
    c.put('stdout', '😀😀😀');
    expect(c.limits()).toBe(0);
    c.put('stdout', 'x');
    expect(c.limits()).toBe(1);
  });

  it('判定の行（行の頭が U+001E）は数えない', () => {
    const c = collect({ maxChars: 5, maxLines: 100 });
    c.put('stderr', '\u001e@@jq {"t":"hello","v":2}\n');
    expect(c.limits()).toBe(0);
    c.put('stderr', 'abcd');
    expect(c.limits()).toBe(0);
    c.put('stdout', 'xy');
    expect(c.limits()).toBe(1);
  });
});

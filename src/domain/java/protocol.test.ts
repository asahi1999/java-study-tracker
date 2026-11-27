import { describe, expect, it } from 'vitest';

import vectors from '../../../java/test-vectors/protocol.json';
import { checkStep, isPassed, parseProtocol, summarize } from './protocol.ts';

describe('parseProtocol・summarize（java/test-vectors/protocol.json）', () => {
  for (const c of vectors.cases) {
    it(c.name, () => {
      const parsed = parseProtocol(c.input);
      expect(parsed.events).toHaveLength(c.expect.events);
      expect(parsed.text).toBe(c.expect.text);
      const summary = summarize(parsed.events);
      expect(isPassed(summary)).toBe(c.expect.passed);
      expect(summary.limit).toBe(c.expect.limit);
      expect(summary.done?.total ?? null).toBe(c.expect.doneTotal);
      expect(summary.stages.map((s) => [s.stage, s.passed, s.total])).toEqual(c.expect.stages);
      const [step, rev, result] = c.expect.step as [string, number, string];
      expect(checkStep(summary, step, rev)).toBe(result);
    });
  }
});

describe('summarize', () => {
  it('段階0のケースを asIs に入れる', () => {
    const { events } = parseProtocol(
      '\n\u001e@@jq {"t":"case","stage":0,"i":0,"name":"そのまま実行","ok":null,"actual":"x","error":null}\n',
    );
    const s = summarize(events);
    expect(s.asIs?.actual).toBe('x');
    expect(s.stages).toEqual([]);
  });
});

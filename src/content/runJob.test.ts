import { describe, expect, it } from 'vitest';

import { buildPlainRunJob, buildRunJob } from './runJob.ts';
import type { StepContent } from './schema.ts';

const step = {
  id: 'ch00.a',
  rev: 3,
  source: 'compact',
  stdin: 'x\n',
  timeoutMs: 2000,
  given: [{ path: 'Pos.java', content: 'record Pos(int x) {}' }],
  tests: 'final class JqProblemTests {}',
  judge: { mode: 'output', cases: [{ name: 'a', stdin: '', expected: 'A\n' }] },
} as unknown as StepContent;

describe('buildRunJob', () => {
  it('ケースを段階1にし、学習者のファイルを Main.java にする', () => {
    const job = buildRunJob(step, 'void main() {}');
    expect(job).toMatchObject({
      stepId: 'ch00.a',
      rev: 3,
      stdin: 'x\n',
      timeoutMs: 2000,
      testsJava: null, // mode: output では Tests.java を使わない
      learnerFiles: [{ path: 'Main.java', content: 'void main() {}' }],
      stages: [{ n: 1, cases: [{ name: 'a', stdin: '', expected: 'A\n' }] }],
    });
    expect(job.givenFiles).toHaveLength(1);
  });

  it('mode: both なら Tests.java を渡す', () => {
    expect(buildRunJob({ ...step, judge: { mode: 'both', cases: [] } }, '').testsJava).toBe(
      step.tests,
    );
  });

  it('そのまま実行はケースも配るファイルも持たない', () => {
    expect(buildPlainRunJob(step, 'x')).toMatchObject({
      stages: [],
      givenFiles: [],
      testsJava: null,
    });
  });

  it('source が無い問題は実行できない', () => {
    expect(() => buildRunJob({ ...step, source: null }, '')).toThrow();
  });
});

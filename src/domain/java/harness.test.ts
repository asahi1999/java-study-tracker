import { describe, expect, it } from 'vitest';

import { assembleSources, generateJqCases, generateJqEntry } from './harness.ts';

const spec = {
  step: 'ch00.sign',
  rev: 2,
  source: 'compact' as const,
  stdin: '',
  learnerFileNames: ['Main.java'],
  stages: [
    {
      n: 1,
      cases: [
        { name: '看板', stdin: '', expected: '###\n' },
        { name: '"引用"', stdin: 'a\n', expected: null },
      ],
    },
  ],
};

describe('generateJqCases', () => {
  it('問題 ID・rev・ケースを Java の定数にする', () => {
    const java = generateJqCases(spec);
    expect(java).toContain('static final String STEP = "ch00.sign";');
    expect(java).toContain('static final int REV = 2;');
    expect(java).toContain('static final int STAGES = 1;');
    expect(java).toContain('"\\"引用\\""');
    expect(java).toContain('"###\\n",\n        null,');
  });

  it('段階が無ければ STAGES = 0 で、配列は空', () => {
    const java = generateJqCases({ ...spec, stages: [] });
    expect(java).toContain('static final int STAGES = 0;');
    expect(java).toContain('static final String[] CASE_NAME = {};');
  });
});

describe('generateJqEntry', () => {
  it('compact は new Main().main()、class は Main.main(new String[0])', () => {
    expect(generateJqEntry('compact')).toContain('new Main().main();');
    expect(generateJqEntry('class')).toContain('Main.main(new String[0]);');
  });
});

describe('assembleSources', () => {
  it('compact の Main.java だけを包み、JqCases・JqEntry を足す', () => {
    const result = assembleSources({
      source: 'compact',
      learnerFiles: [{ path: 'Main.java', content: 'void main() {}' }],
      givenFiles: [{ path: 'Pos.java', content: 'record Pos(int x) {}' }],
      cases: spec,
      harness: { files: [{ path: 'JqRun.java', content: 'final class JqRun {}' }] },
    });
    expect(result.files.map((f) => f.path)).toEqual([
      'Main.java',
      'Pos.java',
      'JqRun.java',
      'JqCases.java',
      'JqEntry.java',
    ]);
    expect(result.files[0].content.startsWith('import module java.base; final class Main {')).toBe(
      true,
    );
    expect(result.wrapped['Main.java']).toBeDefined();
  });

  it('class は包まない', () => {
    const result = assembleSources({
      source: 'class',
      learnerFiles: [{ path: 'Main.java', content: 'public class Main {}' }],
      givenFiles: [],
      cases: { ...spec, source: 'class' },
      harness: { files: [] },
    });
    expect(result.files[0].content).toBe('public class Main {}');
    expect(result.wrapped).toEqual({});
  });
});

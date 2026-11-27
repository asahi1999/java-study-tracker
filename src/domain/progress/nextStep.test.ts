import { describe, expect, it } from 'vitest';

import type { GeneratedCourse, StepSummary } from '../../content/schema.ts';
import { chooseNextStep, placeOf, type ProgressLike, stepAfter } from './nextStep.ts';

function step(id: string, part = 1): StepSummary {
  return {
    id,
    rev: 1,
    type: 'fill',
    title: id,
    chapter: Number(id.slice(2, 4)),
    part,
    order: 10,
    minutes: 2,
    optional: false,
    easy: false,
    goal: null,
    render: 'text',
  };
}

const STEPS = [step('ch00.a'), step('ch00.b'), step('ch00.c', 2), step('ch01.d')];

function p(
  stepId: string,
  status: ProgressLike['status'],
  at: { opened?: string; cleared?: string } = {},
): ProgressLike {
  return { stepId, status, lastOpenedAt: at.opened ?? null, clearedAt: at.cleared ?? null };
}

describe('chooseNextStep（設計書 9-1）', () => {
  it('何もしていなければ、コースの頭', () => {
    expect(chooseNextStep(STEPS, [])).toEqual({ kind: 'step', step: STEPS[0], reason: 'first' });
  });

  it('教材が無ければ empty', () => {
    expect(chooseNextStep([], [])).toEqual({ kind: 'empty' });
  });

  it('開いてのぞいただけ（new）では動かない', () => {
    const r = chooseNextStep(STEPS, [p('ch00.c', 'new', { opened: '2026-12-01T10:00:00Z' })]);
    expect(r).toMatchObject({ step: { id: 'ch00.a' }, reason: 'first' });
  });

  it('書きかけ（trying）のうち、最後に開いたもの', () => {
    const r = chooseNextStep(STEPS, [
      p('ch00.a', 'cleared', { cleared: '2026-12-01T09:00:00Z' }),
      p('ch00.b', 'trying', { opened: '2026-12-01T10:00:00Z' }),
      p('ch00.c', 'trying', { opened: '2026-12-01T11:00:00Z' }),
    ]);
    expect(r).toMatchObject({ step: { id: 'ch00.c' }, reason: 'resume' });
  });

  it('書きかけのあとに別のステップをクリアしていれば、先へ進む（置いてきたものは追いかけない）', () => {
    const r = chooseNextStep(STEPS, [
      p('ch00.a', 'trying', { opened: '2026-12-01T10:00:00Z' }),
      p('ch00.b', 'cleared', { opened: '2026-12-01T10:30:00Z', cleared: '2026-12-01T11:00:00Z' }),
    ]);
    expect(r).toMatchObject({ step: { id: 'ch00.c' }, reason: 'next' });
  });

  it('最後にクリアしたものの次から探し、最後まで無ければ頭から', () => {
    const r = chooseNextStep(STEPS, [
      p('ch00.b', 'cleared', { cleared: '2026-12-01T09:00:00Z' }),
      p('ch00.c', 'cleared', { cleared: '2026-12-01T09:10:00Z' }),
      p('ch01.d', 'cleared', { cleared: '2026-12-01T09:20:00Z' }),
    ]);
    expect(r).toMatchObject({ step: { id: 'ch00.a' }, reason: 'next' });
  });

  it('全部クリアしたら done', () => {
    const all = STEPS.map((s, i) => p(s.id, 'cleared', { cleared: `2026-12-01T0${i}:00:00Z` }));
    expect(chooseNextStep(STEPS, all)).toEqual({ kind: 'done' });
  });

  it('今のコースに無い ID の記録は飛ばす', () => {
    const r = chooseNextStep(STEPS, [p('ch09.gone', 'trying', { opened: '2026-12-01T10:00:00Z' })]);
    expect(r).toMatchObject({ step: { id: 'ch00.a' } });
  });
});

describe('stepAfter', () => {
  it('今のステップのあとで、最初のクリアしていないもの', () => {
    expect(stepAfter(STEPS, [p('ch00.b', 'cleared')], 'ch00.a')?.id).toBe('ch00.c');
  });
  it('ほかに無ければ null', () => {
    const others = STEPS.slice(1).map((s) => p(s.id, 'cleared'));
    expect(stepAfter(STEPS, others, 'ch00.a')).toBeNull();
  });
});

describe('placeOf', () => {
  it('章・部品・部品の中の何番目か', () => {
    const course = {
      version: '1',
      chapters: [
        {
          id: 'ch00',
          number: 0,
          title: '入口',
          parts: [{ n: 1, title: '看板' }],
          steps: STEPS.slice(0, 3),
        },
      ],
    } as unknown as GeneratedCourse;
    const place = placeOf(course, 'ch00.b');
    expect(place?.partTitle).toBe('看板');
    expect(place?.indexInPart).toBe(1);
    expect(place?.partSteps.map((s) => s.id)).toEqual(['ch00.a', 'ch00.b']);
    expect(placeOf(course, 'ch05.x')).toBeNull();
  });
});

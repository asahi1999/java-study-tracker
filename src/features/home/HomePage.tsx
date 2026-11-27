// ホーム（フェーズ1は「次の1ステップ」のカードだけ。F-HOME-1・2・4・6）
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';

import { useServices } from '@/app/services';
import { useRunnerStatus } from '@/app/useRunnerStatus';
import { loadStep } from '@/content/loader';
import type { StepContent } from '@/content/schema';
import { v2db } from '@/db/v2/database';
import { chooseNextStep, courseSteps, placeOf } from '@/domain/progress/nextStep';
import { schedulePrefetch } from '@/runtime/java/prefetch';

import { JavaStatusChip } from './JavaStatusChip';
import { NextStepCard } from './NextStepCard';

export function HomePage() {
  const { content, runner } = useServices();
  const runnerState = useRunnerStatus(runner);
  const progress = useLiveQuery(() => v2db.progress.toArray(), []);
  const steps = useMemo(() => courseSteps(content.course), [content.course]);
  const next = useMemo(
    () => (progress ? chooseNextStep(steps, progress) : null),
    [steps, progress],
  );
  const nextId = next?.kind === 'step' ? next.step.id : null;
  const draft = useLiveQuery(() => (nextId ? v2db.drafts.get(nextId) : undefined), [nextId]);
  const [step, setStep] = useState<StepContent | null>(null);

  useEffect(() => {
    document.title = 'Java ダンジョン工房';
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!nextId) return;
    void loadStep(content, nextId).then((s) => !cancelled && setStep(s));
    return () => {
      cancelled = true;
    };
  }, [content, nextId]);

  // ホームの表示が終わってから、手が空いたときに Java の準備を始める（設計書 4-10）
  useEffect(() => schedulePrefetch(runner), [runner]);

  const progressMap = useMemo(
    () => new Map((progress ?? []).map((p) => [p.stepId, p])),
    [progress],
  );
  const place = nextId ? placeOf(content.course, nextId) : null;

  return (
    <div className="grid gap-6">
      <div className="max-w-[560px]">
        {next === null ? (
          <p role="status" className="text-sm text-ink-dim">
            読み込み中…
          </p>
        ) : next.kind === 'empty' ? (
          <section className="notch-2 border-2 border-line bg-panel p-8">
            <h1 className="font-display text-display-m">教材がまだありません</h1>
            <p className="mt-2 text-sm text-ink-dim">
              公開済みのステップができたら、ここに次の1ステップが出ます。
            </p>
          </section>
        ) : next.kind === 'done' ? (
          <section className="notch-2 border-2 border-torch/40 bg-panel p-8">
            <p className="eyebrow text-torch-text">次の1ステップ</p>
            <h1 className="mt-3 font-display text-display-l">次の章は準備中です</h1>
            <p className="mt-2 text-sm text-ink-dim">公開中のステップは全部クリアしました。</p>
          </section>
        ) : step && place && step.id === nextId ? (
          <NextStepCard step={step} place={place} draft={draft} progress={progressMap} />
        ) : (
          <p role="status" className="text-sm text-ink-dim">
            読み込み中…
          </p>
        )}
      </div>
      <JavaStatusChip status={runnerState.status} progress={runnerState.progress} />
    </div>
  );
}

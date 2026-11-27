// ステップ画面（#/step/:stepId）。教材と書きかけを読んでから、種類ごとの画面を出す
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useServices } from '@/app/services';
import { useRunnerStatus } from '@/app/useRunnerStatus';
import { buttonClass } from '@/components/game/buttonStyles';
import { loadStep } from '@/content/loader';
import { isWriteType, type StepContent } from '@/content/schema';
import { getDraft } from '@/db/v2/drafts';
import { markOpened } from '@/db/v2/progress';
import type { Draft, Progress } from '@/db/v2/types';
import { placeOf } from '@/domain/progress/nextStep';

import { CardStep } from './CardStep';
import { PredictStep } from './PredictStep';
import { type SaveState, StepTopBar } from './StepTopBar';
import { UnsupportedBanner } from './UnsupportedBanner';
import { WriteStep } from './WriteStep';

type Loaded =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; step: StepContent; draft: Draft | undefined; progress: Progress };

function StepView({ stepId }: { stepId: string }) {
  const { content, runner, now } = useServices();
  const { status: runnerStatus } = useRunnerStatus(runner);
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [save, setSave] = useState<SaveState | null>(null);
  const onSaveState = useCallback((s: SaveState) => setSave(s), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const step = await loadStep(content, stepId);
      if (!step) return { status: 'missing' } as const;
      const [draft, progress] = await Promise.all([
        getDraft(stepId),
        markOpened(step, now().toISOString()),
      ]);
      return { status: 'ready', step, draft, progress } as const;
    })().then(
      (l) => !cancelled && setLoaded(l),
      () => !cancelled && setLoaded({ status: 'missing' }),
    );
    return () => {
      cancelled = true;
    };
  }, [content, stepId, now]);

  useEffect(() => {
    if (loaded.status === 'ready') document.title = `${loaded.step.title} - Java ダンジョン工房`;
  }, [loaded]);

  if (loaded.status === 'loading') {
    return (
      <p role="status" className="p-8 text-sm text-ink-dim">
        読み込み中…
      </p>
    );
  }
  if (loaded.status === 'missing') {
    return (
      <div className="p-8">
        <h1 className="font-display text-display-m">このステップは見つかりません</h1>
        <p className="mt-2 text-sm text-ink-dim">
          教材が変わったか、URL が間違っている可能性があります。
        </p>
        <Link to="/" className={buttonClass('secondary', 'md', 'mt-6')}>
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const { step, draft, progress } = loaded;
  const place = placeOf(content.course, step.id);
  const canRun = runnerStatus !== 'unsupported' && step.runtime === 'browser';
  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <StepTopBar step={step} place={place} save={isWriteType(step.type) ? save : null} />
      {runnerStatus === 'unsupported' && step.type !== 'quiz' && <UnsupportedBanner />}
      {isWriteType(step.type) ? (
        <WriteStep
          step={step}
          draft={draft}
          initialHints={progress.maxHint}
          onSaveState={onSaveState}
        />
      ) : step.type === 'card' ? (
        <CardStep step={step} canRun={canRun} />
      ) : step.type === 'predict' || step.type === 'quiz' ? (
        <PredictStep step={step} canRun={canRun} initialHints={progress.maxHint} />
      ) : (
        <p className="p-8 text-sm">この種類のステップ（{step.type}）はまだ開けません。</p>
      )}
    </div>
  );
}

export function StepPage() {
  const { stepId = '' } = useParams();
  // 別のステップに移ったら、エディタや結果を作り直す
  return <StepView key={stepId} stepId={stepId} />;
}

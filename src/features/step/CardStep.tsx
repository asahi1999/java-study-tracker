// 説明カード（F-STEP-1）: 説明と、その場で動かせる例のコード（編集できる、保存しない）。「わかった」でクリア
import { useRef, useState } from 'react';

import { useServices } from '@/app/services';
import { JavaEditor, type JavaEditorHandle } from '@/components/editor/JavaEditor';
import { buttonClass } from '@/components/game/buttonStyles';
import { Markdown } from '@/components/game/Markdown';
import { TileOutput } from '@/components/tiles/TileOutput';
import { buildPlainRunJob } from '@/content/runJob';
import type { StepContent } from '@/content/schema';
import { markCleared } from '@/db/v2/progress';
import type { RunResult } from '@/runtime/java/JavaRunner';

import { ClearPanel } from './ClearPanel';
import { STEP_TYPE_LABELS } from './labels';
import { ErrorPanel } from './ResultParts';
import { outputOf } from './runSummary';
import { useNextAfter } from './useCourseProgress';

type Props = { step: StepContent; canRun: boolean };

export function CardStep({ step, canRun }: Props) {
  const { runner, now } = useServices();
  const next = useNextAfter(step.id);
  const editorRef = useRef<JavaEditorHandle>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setRunning(true);
    const r = await runner.run(
      buildPlainRunJob(step, editorRef.current?.getValue() ?? step.example ?? ''),
    );
    if (r.kind === 'cancelled') return;
    setRunning(false);
    setResult(r);
  };

  const understood = async () => {
    await markCleared(step, now().toISOString());
    setDone(true);
  };

  return (
    <div className="grid flex-1 gap-0 lg:grid-cols-2 lg:overflow-hidden">
      <section
        aria-labelledby="step-title"
        className="overflow-auto bg-panel px-6 py-8 lg:border-r-2 lg:border-line lg:px-10"
      >
        <p className="eyebrow text-torch-text">{STEP_TYPE_LABELS[step.type]}</p>
        <h1 id="step-title" className="mt-3 font-display text-display-m">
          {step.title}
        </h1>
        {step.body.explain && <Markdown text={step.body.explain} className="mt-4" />}
      </section>
      <section
        aria-label="例のコード"
        className="grid content-start gap-4 overflow-auto px-6 py-8 lg:px-10"
      >
        {step.example !== null && (
          <>
            <div>
              <p className="mb-2 text-xs text-ink-dim">
                例のコード（書きかえて動かせます。保存はしません）
              </p>
              <div className="on-well min-h-[160px] border-2 border-line bg-well">
                <JavaEditor
                  ref={editorRef}
                  initialValue={step.example}
                  ariaLabel="例のコード"
                  onRun={canRun ? () => void run() : undefined}
                />
              </div>
            </div>
            {canRun && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void run()}
                  className={buttonClass('secondary', 'md')}
                >
                  <span aria-hidden="true">▶</span> 動かしてみる
                </button>
                {running && <span className="text-xs text-ink-dim">実行中…</span>}
              </div>
            )}
            {result && (
              <div aria-live="polite" className="grid gap-3">
                {result.kind !== 'judged' && (
                  <ErrorPanel
                    result={result}
                    onJumpToLine={(l) => editorRef.current?.focusLine(l)}
                  />
                )}
                {outputOf(result) !== null && (
                  <div>
                    <h2 className="mb-2 font-display text-display-s">出力</h2>
                    <TileOutput output={outputOf(result)} render={step.render} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {done ? (
          <ClearPanel
            title="わかった"
            message="説明カードを読みました。"
            commentary={null}
            next={next}
          />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => void understood()}
              className={buttonClass('primary', 'lg')}
            >
              わかった
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

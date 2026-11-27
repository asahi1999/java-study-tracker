// 書く問題（穴埋め・修理・実装・絵）のステップ画面（05-visual-design.md 5-2・7-4〜7-6、mockups/problem.html）。
// 3列: 問題文 | エディタ | 結果
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useServices } from '@/app/services';
import { useRunnerStatus } from '@/app/useRunnerStatus';
import { type EditorMark, JavaEditor, type JavaEditorHandle } from '@/components/editor/JavaEditor';
import { buttonClass } from '@/components/game/buttonStyles';
import { Markdown } from '@/components/game/Markdown';
import { TileOutput } from '@/components/tiles/TileOutput';
import { buildRunJob, LEARNER_FILE } from '@/content/runJob';
import type { StepContent } from '@/content/schema';
import { saveDraft } from '@/db/v2/drafts';
import { markTrying, recordAttempt, recordHint } from '@/db/v2/progress';
import type { Draft } from '@/db/v2/types';
import { useAutoSave } from '@/hooks/useAutoSave';
import { isCleared, type RunResult } from '@/runtime/java/JavaRunner';

import { ClearPanel } from './ClearPanel';
import { HintList } from './HintList';
import { STEP_TYPE_LABELS } from './labels';
import { ErrorPanel, failedCases, FailureList } from './ResultParts';
import { attemptOf, liveMessage, outputOf, runStatusText, torchesOf } from './runSummary';
import type { SaveState } from './StepTopBar';
import { TorchPanel } from './TorchPanel';
import { useNextAfter } from './useCourseProgress';

type Props = {
  step: StepContent;
  draft: Draft | undefined;
  initialHints: number;
  onSaveState: (s: SaveState) => void;
};

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** 書きかけの行が教材の行とずれていなければ、印（書くのはここ・折りたたみ）をそのまま使う */
function markersFor(step: StepContent, code: string) {
  const starter = step.starter;
  if (!starter) return { writeLines: [], folds: [] };
  if (code === starter.code) return { writeLines: starter.writeLines, folds: starter.folds };
  const a = starter.code.split('\n');
  const b = code.split('\n');
  const sameCount = a.length === b.length;
  const folds = starter.folds.filter((f) => {
    for (let n = f.from; n <= f.to; n++) if (a[n - 1] !== b[n - 1]) return false;
    return true;
  });
  return { writeLines: sameCount ? starter.writeLines : [], folds: sameCount ? folds : [] };
}

export function WriteStep({ step, draft, initialHints, onSaveState }: Props) {
  const { runner, now } = useServices();
  const runnerState = useRunnerStatus(runner);
  const next = useNextAfter(step.id);
  const editorRef = useRef<JavaEditorHandle>(null);
  const starterCode = step.starter?.code ?? '';
  const initialCode = draft?.files[LEARNER_FILE] ?? starterCode;
  const markers = useMemo(() => markersFor(step, initialCode), [step, initialCode]);
  const cases = useMemo(() => step.judge?.cases ?? [], [step]);

  const codeRef = useRef(initialCode);
  const draftRevRef = useRef(draft?.rev ?? step.rev);
  const triedRef = useRef(false);
  const [revNotice, setRevNotice] = useState(draft !== undefined && draft.rev !== step.rev);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hints, setHints] = useState(initialHints);
  const [result, setResult] = useState<RunResult | null>(null);
  const [elapsed, setElapsed] = useState<number | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [announce, setAnnounce] = useState('');

  const {
    status: saveStatus,
    schedule,
    flush,
  } = useAutoSave<Draft>(async (d) => {
    await saveDraft(d);
  });
  useEffect(() => {
    onSaveState(saveStatus === 'idle' ? (draft ? 'saved' : 'idle') : saveStatus);
  }, [saveStatus, draft, onSaveState]);

  const onChange = useCallback(
    (code: string, cursorLine: number) => {
      codeRef.current = code;
      schedule({
        stepId: step.id,
        rev: draftRevRef.current,
        files: { [LEARNER_FILE]: code },
        cursorLine,
        updatedAt: now().toISOString(),
      });
      if (!triedRef.current) {
        triedRef.current = true;
        void markTrying(step);
      }
    },
    [schedule, step, now],
  );

  const run = useCallback(async () => {
    flush();
    setRunning(true);
    setAnnounce('実行中');
    const started = performance.now();
    const r = await runner.run(buildRunJob(step, codeRef.current));
    if (r.kind === 'cancelled') return; // 次の実行に引き継いだ
    setRunning(false);
    setResult(r);
    setElapsed(performance.now() - started);
    setAnnounce(liveMessage(r, torchesOf(r, cases)));
    const attempt = attemptOf(r, cases.length);
    if (!attempt) return;
    triedRef.current = true;
    await recordAttempt(
      step,
      { ...attempt, where: 'browser', durationMs: r.kind === 'judged' ? Math.round(r.ms) : null },
      now().toISOString(),
    );
    if (isCleared(r)) setCleared(true);
  }, [flush, runner, step, cases, now]);

  const reset = () => {
    draftRevRef.current = step.rev;
    editorRef.current?.setValue(starterCode);
    setConfirmReset(false);
    setRevNotice(false);
    editorRef.current?.focus();
  };

  const openHint = (level: 1 | 2 | 3) => {
    setHints((h) => Math.max(h, level));
    void recordHint(step, level);
  };

  const marks: EditorMark[] = useMemo(() => {
    if (result?.kind === 'compile-error') {
      return result.diagnostics
        .filter((d) => d.origin === 'learner')
        .map((d) => ({ line: d.line, column: d.column, message: d.message }));
    }
    if (result?.kind === 'precheck')
      return [{ line: result.line, column: 1, message: '実行の前に止めました' }];
    return [];
  }, [result]);

  const compileError = result?.kind === 'compile-error' || result?.kind === 'precheck';
  const torches = torchesOf(result, cases);
  const status = runStatusText(result, elapsed);
  const target =
    step.type === 'draw' && step.render === 'tiles' ? (cases[0]?.expected ?? null) : null;
  const failures = failedCases(result);
  const downloading = runnerState.status === 'downloading';

  const errorPanel =
    result && result.kind !== 'judged' ? (
      <ErrorPanel result={result} onJumpToLine={(line) => editorRef.current?.focusLine(line)} />
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_400px] min-[1440px]:grid-cols-[360px_minmax(0,1fr)_440px]">
      {/* 左: 問題文 */}
      <section
        aria-labelledby="step-title"
        className="flex flex-col overflow-auto bg-panel px-6 py-6 lg:border-r-2 lg:border-line"
      >
        <p className="eyebrow text-torch-text">{STEP_TYPE_LABELS[step.type]}</p>
        <h1 id="step-title" className="mt-3 font-display text-display-m">
          {step.title}
        </h1>
        {step.body.problem && <Markdown text={step.body.problem} className="mt-4" />}
        <HintList hints={step.body.hints} opened={hints} onOpen={openHint} />
      </section>

      <div className="flex min-h-0 flex-col lg:overflow-auto xl:contents">
        {/* 中: エディタ */}
        <section
          aria-label="エディタ"
          className="on-well flex min-h-[360px] flex-col bg-well lg:h-[55vh] lg:shrink-0 xl:h-auto xl:min-h-0 xl:border-r-2 xl:border-line"
        >
          <div className="flex h-10 shrink-0 items-stretch border-b-2 border-[#2f2b40] bg-well-2">
            <span className="flex items-center bg-well px-4 font-mono text-[13px] text-well-ink shadow-[inset_0_2px_0_rgb(var(--torch))]">
              {LEARNER_FILE}
            </span>
            <span className="flex-1" />
            {confirmReset ? (
              <span className="flex items-center gap-2 px-3 text-xs text-well-dim">
                最初のコードに戻しますか？
                <button
                  type="button"
                  onClick={reset}
                  className="px-2 py-1 font-bold text-torch-hi underline focus-visible:shadow-focus-in focus-visible:outline-none"
                >
                  戻す
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 text-well-dim underline focus-visible:shadow-focus-in focus-visible:outline-none"
                >
                  やめる
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 text-xs text-well-dim underline-offset-2 hover:text-well-ink hover:underline focus-visible:shadow-focus-in focus-visible:outline-none"
              >
                最初のコードに戻す
              </button>
            )}
          </div>
          {revNotice && (
            <p
              role="status"
              className="flex items-center gap-3 bg-torch/15 px-4 py-2 text-xs text-well-ink"
            >
              問題が新しくなりました。書きかけは残しています
              <button type="button" onClick={() => setRevNotice(false)} className="underline">
                閉じる
              </button>
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <JavaEditor
              ref={editorRef}
              initialValue={initialCode}
              writeLines={markers.writeLines}
              folds={markers.folds}
              marks={marks}
              ariaLabel={`${LEARNER_FILE} のコード`}
              onChange={onChange}
              onRun={() => void run()}
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-[#2f2b40] bg-well-2 px-4 py-3">
            <button
              type="button"
              onClick={() => void run()}
              className={buttonClass('primary', 'md')}
            >
              <span aria-hidden="true">▶</span> 実行
              <kbd className="kbd !bg-torch-ink/15">{isMac ? '⌘' : 'Ctrl'} Enter</kbd>
            </button>
            <span className="text-xs text-well-faint">Esc → Tab でエディタから出る</span>
            <span className="ml-auto font-mono text-xs">
              {running ? (
                <span className="text-well-dim">
                  {downloading
                    ? `Java を準備中 ${Math.round(runnerState.progress * 100)}%`
                    : '実行中…'}
                </span>
              ) : (
                status && (
                  <span
                    className={
                      status.tone === 'moss'
                        ? 'text-[#86c79f]'
                        : status.tone === 'ember'
                          ? 'text-[#f08f70]'
                          : 'text-well-dim'
                    }
                  >
                    {status.text}
                  </span>
                )
              )}
            </span>
          </div>
        </section>

        {/* 右: 結果 */}
        <section
          aria-label="結果"
          className="grid content-start gap-6 overflow-auto bg-panel px-6 py-6"
        >
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>
          {compileError && errorPanel}
          <TorchPanel items={torches} compileError={compileError} />
          {!compileError && errorPanel}
          <FailureList cases={failures} />
          <section aria-labelledby="output-heading">
            <h2 id="output-heading" className="mb-2 font-display text-display-s">
              出力
            </h2>
            <TileOutput
              output={outputOf(result)}
              render={step.render}
              target={target}
              emptyText="まだ実行していません。▶ 実行 で動かすと、ここに出力が出ます。"
            />
            <p className="mt-2 text-xs text-ink-faint">
              手元の VS Code で動かしても、左と同じ文字が出ます。
            </p>
          </section>
          {cleared && (
            <ClearPanel
              message="テストが全部通りました。"
              commentary={step.body.commentary}
              next={next}
            />
          )}
        </section>
      </div>
    </div>
  );
}

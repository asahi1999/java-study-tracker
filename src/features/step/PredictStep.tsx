// 予想（F-STEP-2）と確認クイズ: 読むだけのコードの出力を、入力か選択肢で答える。
// 入力は全角・半角を NFKC でそろえ、行末の空白と最後の空行を無視して比べる（domain/judge/predict）
import { useId, useState } from 'react';

import { useServices } from '@/app/services';
import { JavaEditor } from '@/components/editor/JavaEditor';
import { buttonClass } from '@/components/game/buttonStyles';
import { Markdown } from '@/components/game/Markdown';
import { TileOutput } from '@/components/tiles/TileOutput';
import { buildPlainRunJob } from '@/content/runJob';
import type { StepContent } from '@/content/schema';
import { recordAttempt, recordHint } from '@/db/v2/progress';
import { samePredict } from '@/domain/judge/predict';
import type { RunResult } from '@/runtime/java/JavaRunner';

import { DiffView } from './DiffView';
import { EndActions } from './EndActions';
import { HintList } from './HintList';
import { STEP_TYPE_LABELS } from './labels';
import { ErrorPanel } from './ResultParts';
import { outputOf } from './runSummary';
import { useNextAfter } from './useCourseProgress';

type Props = { step: StepContent; canRun: boolean; initialHints: number };

/** 選択肢の出力を見えるように（最後の改行は見せない） */
function choiceText(c: string): string {
  return c.replace(/\n$/, '');
}

export function PredictStep({ step, canRun, initialHints }: Props) {
  const { runner, now } = useServices();
  const next = useNextAfter(step.id);
  const groupId = useId();
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [answered, setAnswered] = useState<{ correct: boolean; answer: string } | null>(null);
  const [hints, setHints] = useState(initialHints);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  const usesChoices = step.type === 'quiz' || step.inputMode === 'choice';
  const choices = step.choices ?? [];
  const expected = step.expectedOutput ?? '';

  const answer = async () => {
    let correct: boolean;
    let given: string;
    if (usesChoices) {
      if (choice === null) return;
      correct = choice === step.answer;
      given = choices[choice] ?? '';
    } else {
      correct = samePredict(expected, text);
      given = text;
    }
    setAnswered({ correct, answer: given });
    await recordAttempt(
      step,
      {
        result: correct ? 'pass' : 'wrong-answer',
        passed: correct ? 1 : 0,
        total: 1,
        where: 'none',
        durationMs: null,
      },
      now().toISOString(),
    );
  };

  const retry = () => {
    setAnswered(null);
    setResult(null);
  };

  const runProgram = async () => {
    setRunning(true);
    const r = await runner.run(buildPlainRunJob(step, step.program ?? ''));
    if (r.kind === 'cancelled') return;
    setRunning(false);
    setResult(r);
  };

  const openHint = (level: 1 | 2 | 3) => {
    setHints((h) => Math.max(h, level));
    void recordHint(step, level);
  };

  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:overflow-hidden">
      <section
        aria-labelledby="step-title"
        className="overflow-auto bg-panel px-6 py-8 lg:border-r-2 lg:border-line lg:px-10"
      >
        <p className="eyebrow text-torch-text">{STEP_TYPE_LABELS[step.type]}</p>
        <h1 id="step-title" className="mt-3 font-display text-display-m">
          {step.title}
        </h1>
        {step.body.problem && <Markdown text={step.body.problem} className="mt-4" />}
        <HintList hints={step.body.hints} opened={hints} onOpen={openHint} />
      </section>

      <section
        aria-label="答える"
        className="grid content-start gap-5 overflow-auto px-6 py-8 lg:px-10"
      >
        {step.program !== null && (
          <div>
            <p className="mb-2 text-xs text-ink-dim">読むだけのコード</p>
            <div className="on-well border-2 border-line bg-well">
              <JavaEditor initialValue={step.program} readOnly ariaLabel="読むだけのコード" />
            </div>
          </div>
        )}

        {usesChoices ? (
          <fieldset disabled={answered !== null}>
            <legend className="mb-2 text-sm font-bold">
              {step.type === 'quiz' ? '答えを選ぶ' : '出力を予想して選ぶ'}
            </legend>
            <div className="grid gap-2">
              {choices.map((c, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-start gap-3 bg-panel px-3 py-2 shadow-edge has-[:checked]:shadow-[inset_0_0_0_2px_rgb(var(--torch))] has-[:focus-visible]:shadow-focus-in`}
                >
                  <input
                    type="radio"
                    name={groupId}
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    className="mt-1 accent-[rgb(var(--torch))]"
                  />
                  <span className="font-bold">{String.fromCharCode(65 + i)}</span>
                  {step.type === 'quiz' ? (
                    <span>{c}</span>
                  ) : (
                    <pre className="m-0 whitespace-pre font-mono text-code">{choiceText(c)}</pre>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div>
            <label htmlFor={`${groupId}-text`} className="mb-2 block text-sm font-bold">
              出力を予想して入力
            </label>
            <textarea
              id={`${groupId}-text`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={answered !== null}
              rows={Math.max(3, expected.split('\n').length + 1)}
              spellCheck={false}
              className="on-well block w-full resize-y bg-well p-3 font-mono text-code text-well-ink focus-visible:outline-none focus-visible:shadow-focus-in"
            />
          </div>
        )}

        {!answered && (
          <div>
            <button
              type="button"
              onClick={() => void answer()}
              disabled={usesChoices && choice === null}
              className={buttonClass('primary', 'md')}
            >
              答える
            </button>
          </div>
        )}

        {answered && (
          <div aria-live="polite" className="grid gap-4">
            <p
              className={`font-display text-display-s ${answered.correct ? 'text-moss' : 'text-ink'}`}
            >
              {answered.correct ? '正解' : 'ちがいました'}
            </p>
            {step.type === 'predict' && (
              <div>
                <h2 className="mb-2 text-sm font-bold">実際の出力</h2>
                {answered.correct ? (
                  <pre className="on-well m-0 bg-well p-3 font-mono text-code text-well-ink">
                    {expected}
                  </pre>
                ) : (
                  <DiffView
                    expected={expected}
                    actual={answered.answer}
                    expectedLabel="実際"
                    actualLabel="予想"
                  />
                )}
              </div>
            )}
            {step.type === 'quiz' && !answered.correct && step.answer !== null && (
              <p className="text-sm">
                正しい答えは {String.fromCharCode(65 + step.answer)}「{choices[step.answer]}」
              </p>
            )}
            {step.body.commentary && (
              <div>
                <h2 className="mb-1 text-xs font-bold text-moss">解説</h2>
                <Markdown text={step.body.commentary} className="!text-sm" />
              </div>
            )}
            {canRun && step.program !== null && (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void runProgram()}
                    className={buttonClass('ghost', 'md')}
                  >
                    <span aria-hidden="true">▶</span> 動かして確かめる
                  </button>
                  {running && <span className="text-xs text-ink-dim">実行中…</span>}
                </div>
                {result &&
                  (result.kind === 'judged' ? (
                    <TileOutput output={outputOf(result)} render={step.render} />
                  ) : (
                    <ErrorPanel result={result} onJumpToLine={() => {}} />
                  ))}
              </div>
            )}
            {!answered.correct && (
              <div>
                <button type="button" onClick={retry} className={buttonClass('ghost', 'md')}>
                  もう一度答える
                </button>
              </div>
            )}
            <EndActions next={next} autoFocus={answered.correct} />
          </div>
        )}
      </section>
    </div>
  );
}

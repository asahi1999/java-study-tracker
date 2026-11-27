// 次の1ステップのカード（F-HOME-1・2、05-visual-design.md 7-3、mockups/home.html）
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/game/buttonStyles';
import { Chip } from '@/components/game/Chip';
import { Markdown } from '@/components/game/Markdown';
import { TileGrid } from '@/components/tiles/TileGrid';
import { LEARNER_FILE } from '@/content/runJob';
import type { StepContent } from '@/content/schema';
import type { Draft, Progress } from '@/db/v2/types';
import type { StepPlace } from '@/domain/progress/nextStep';
import { layoutTiles } from '@/domain/tiles/layout';
import { STEP_TYPE_LABELS } from '@/features/step/labels';

type Props = {
  step: StepContent;
  place: StepPlace;
  draft: Draft | undefined;
  progress: Map<string, Progress>;
};

/** 問題文の冒頭3行（空行は数えない） */
export function firstLines(markdown: string | null, max = 3): string {
  if (!markdown) return '';
  return markdown
    .split('\n')
    .filter((l) => l.trim() !== '')
    .slice(0, max)
    .join('\n\n');
}

/** 書きかけの「前回の続き」: カーソルの行を中心に最大5行 */
export function draftExcerpt(
  code: string,
  cursorLine: number | null,
  size = 5,
): { from: number; lines: string[] } {
  const lines = code.split('\n');
  const center = Math.min(Math.max(cursorLine ?? 1, 1), lines.length);
  const from = Math.max(1, Math.min(center - Math.floor(size / 2), lines.length - size + 1));
  return { from, lines: lines.slice(from - 1, from - 1 + size) };
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NextStepCard({ step, place, draft, progress }: Props) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  // 最初の表示で「つづける」にフォーカスを置き、Enter で押せるようにする（ページ全体で Enter を横取りしない）
  useEffect(() => {
    buttonRef.current?.focus();
  }, [step.id]);

  const intro = firstLines(step.body.problem ?? step.body.explain);
  const goalOutput = step.render === 'tiles' ? (step.judge?.cases[0]?.expected ?? null) : null;
  const goalGrid = useMemo(() => {
    const l = goalOutput ? layoutTiles(goalOutput) : null;
    return l?.kind === 'grid' ? l.grid : null;
  }, [goalOutput]);
  const code = draft?.files[LEARNER_FILE];
  const excerpt = code ? draftExcerpt(code, draft?.cursorLine ?? null) : null;

  return (
    <section
      aria-labelledby="next-step-title"
      className="notch-2 border-2 border-torch/40 bg-panel bg-gradient-to-b from-torch/[.07] to-transparent p-8"
    >
      <p className="eyebrow text-torch-text">次の1ステップ</p>
      <p className="mt-3 text-sm text-ink-dim">
        <span className="font-bold text-ink">
          第{place.chapter.number}章 {place.chapter.title}
        </span>{' '}
        ／ 部品 {place.chapter.number}-{step.part}
        {place.partTitle ? `「${place.partTitle}」` : ''} ／ ステップ {place.indexInPart + 1} /{' '}
        {place.partSteps.length}
      </p>
      <h1 id="next-step-title" className="mt-2 font-display text-display-l">
        {step.title}
      </h1>
      {intro && <Markdown text={intro} className="mt-2 !text-ink-dim [&_p]:my-1" />}

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip tone="torch">約{step.minutes}分</Chip>
        <Chip>{step.runtime === 'local' ? '手元で実行' : 'ブラウザで実行'}</Chip>
        <Chip>{STEP_TYPE_LABELS[step.type]}</Chip>
      </div>

      {excerpt && draft && (
        <div className="mt-5">
          <div className="mb-1 flex items-baseline justify-between text-xs text-ink-dim">
            <span>前回の続き</span>
            <span>自動保存 {formatSavedAt(draft.updatedAt)}</span>
          </div>
          <pre
            aria-label="前回の続きのコード"
            className="on-well m-0 overflow-x-auto bg-well py-2 font-mono text-code text-well-ink"
          >
            {excerpt.lines.map((l, i) => (
              <span key={i} className="block px-3">
                <span
                  aria-hidden="true"
                  className="mr-4 inline-block w-6 text-right text-well-faint"
                >
                  {excerpt.from + i}
                </span>
                {l}
              </span>
            ))}
          </pre>
        </div>
      )}

      {(goalGrid || step.goal) && (
        <div className="on-well mt-5 flex items-center gap-4 bg-well p-4">
          {goalGrid && (
            <TileGrid grid={goalGrid} size={8} label={`できあがりの絵。${step.goal ?? ''}`} />
          )}
          <div>
            <p className="text-sm font-bold text-well-ink">できあがるとこうなる</p>
            {step.goal && <p className="text-xs text-well-dim">{step.goal}</p>}
          </div>
        </div>
      )}

      <Link
        ref={buttonRef}
        to={`/step/${step.id}`}
        className={buttonClass('primary', 'lg', 'mt-6')}
      >
        <span aria-hidden="true">▶</span> つづける
        <kbd className="kbd !bg-torch-ink/15">Enter</kbd>
      </Link>
      <p className="mt-4 text-sm text-ink-dim">
        <span className="font-bold text-moss">このステップだけで終えてOK。</span>
        書きかけも自動で保存されます。
      </p>

      {place.partSteps.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <span>この部品</span>
          <ol className="flex flex-wrap gap-2">
            {place.partSteps.map((s) => {
              const here = s.id === step.id;
              const done = progress.get(s.id)?.status === 'cleared';
              return (
                <li
                  key={s.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 ${
                    here
                      ? 'font-bold text-ink shadow-[inset_0_0_0_2px_rgb(var(--torch))]'
                      : 'bg-panel-2'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 ${done ? 'bg-moss' : here ? 'bg-torch' : 'shadow-[inset_0_0_0_1px_rgb(var(--line-strong))]'}`}
                  />
                  <span className="sr-only">{done ? '済' : here ? 'いまここ' : 'まだ'}</span>{' '}
                  {s.title}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

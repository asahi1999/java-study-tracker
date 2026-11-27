// ステップ画面の上の帯（48px。05-visual-design.md 5-2・7-10）。ナビの代わりにパンくずと、ステップ k/n・約N分・保存の状態
import { Link } from 'react-router-dom';

import { Chip } from '@/components/game/Chip';
import { PixelTorchLogo } from '@/components/game/PixelTorchLogo';
import type { StepContent } from '@/content/schema';
import type { StepPlace } from '@/domain/progress/nextStep';

import { partLabel } from './labels';

export type SaveState = 'idle' | 'pending' | 'saved' | 'error';

type Props = { step: StepContent; place: StepPlace | null; save: SaveState | null };

const SAVE_TEXT: Record<SaveState, string> = {
  idle: '自動保存',
  pending: '保存中…',
  saved: '自動保存済み',
  error: '保存できませんでした',
};

export function StepTopBar({ step, place, save }: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b-2 border-line bg-topbar px-4">
      <Link to="/" aria-label="ホーム" className="shrink-0 focus-visible:shadow-focus-in">
        <PixelTorchLogo size={24} />
      </Link>
      <nav aria-label="パンくず" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2 text-sm text-ink-dim">
          <li>
            <Link to="/" className="hover:text-ink hover:underline">
              ホーム
            </Link>
          </li>
          {place && (
            <li className="hidden truncate sm:block">
              <span aria-hidden="true" className="mr-2 text-ink-faint">
                /
              </span>
              第{place.chapter.number}章 {place.chapter.title}
            </li>
          )}
          <li className="truncate font-bold text-ink" aria-current="page">
            <span aria-hidden="true" className="mr-2 font-normal text-ink-faint">
              /
            </span>
            {partLabel(step.chapter, step.part)} {place?.partTitle ?? step.title}
          </li>
        </ol>
      </nav>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        {place && (
          <span className="hidden md:inline-flex">
            <Chip>
              ステップ {place.indexInPart + 1} / {place.partSteps.length}
            </Chip>
          </span>
        )}
        <Chip tone="torch">約{step.minutes}分</Chip>
        {save && (
          <span className="flex items-center gap-1.5 text-ink-faint" role="status">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 ${save === 'error' ? 'bg-ember' : 'bg-moss'}`}
            />
            {SAVE_TEXT[save]}
          </span>
        )}
      </div>
    </header>
  );
}

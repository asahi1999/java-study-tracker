// テストの松明（05-visual-design.md 7-6）。1テスト＝松明1本。色だけに頼らず、数と「通過／まだ」を文字で出す
import { TorchIcon } from '@/components/torch/TorchIcon';

import type { TorchItem } from './runSummary';
import { torchSummary } from './runSummary';

type Props = { items: TorchItem[]; compileError: boolean };

export function TorchPanel({ items, compileError }: Props) {
  const size = compileError ? 20 : 32;
  return (
    <section aria-labelledby="torch-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="torch-heading" className="font-display text-display-s">
          テスト
        </h2>
        <p className="text-xs text-ink-dim">{torchSummary(items, compileError)}</p>
      </div>
      <ul className={`mt-3 grid gap-3 ${compileError ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {items.map((t, i) => (
          <li
            key={`${i}-${t.name}`}
            className={`flex items-center gap-2 ${compileError ? 'flex-row' : 'flex-col text-center'}`}
          >
            <TorchIcon lit={t.lit} size={size} delayMs={i * 120} />
            <span className={`line-clamp-2 text-xs ${t.lit ? 'text-ink' : 'text-ink-dim'}`}>
              <span className="sr-only">{t.lit ? '通過' : 'まだ'}</span> {t.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

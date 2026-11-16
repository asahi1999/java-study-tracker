import { useLiveQuery } from 'dexie-react-hooks';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

import { settingsRepository } from '@/db/repositories';
import type { Theme } from '@/types';

const THEME_OPTIONS: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'system', label: 'システムに合わせる', icon: Monitor },
];

// ラジオボタン本体は見えなくして、ラベル全体を選択肢として見せる。
// 選択中・フォーカス中の見た目は、中のラジオボタンの状態（:checked / :focus-visible）から決める
const OPTION_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded border-[1.5px] border-line px-3 py-2.5 text-sm transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:font-bold has-[:checked]:text-surface has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--focus))]';

export function ThemeSetting() {
  const settings = useLiveQuery(() => settingsRepository.get());

  if (!settings) return null;

  return (
    <fieldset className="rounded-md border border-line bg-surface p-4 sm:p-5">
      {/* legend は標準だと枠線の上に乗るので、float で枠の中に入れてカードの見出しと同じ見た目にする */}
      <legend className="float-left mb-3 w-full text-sm font-bold tracking-wide text-muted">
        テーマ
      </legend>
      <div className="clear-both grid gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <label key={value} className={OPTION_CLASS}>
            <input
              type="radio"
              name="theme"
              value={value}
              checked={settings.theme === value}
              onChange={() => void settingsRepository.update({ theme: value })}
              className="sr-only"
            />
            <Icon aria-hidden className="size-[18px] shrink-0" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

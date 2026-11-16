import { Link } from 'react-router-dom';

export type RoadmapViewMode = 'month' | 'step';

const OPTIONS: readonly { mode: RoadmapViewMode; label: string; to: string }[] = [
  { mode: 'month', label: '月ごと', to: '/roadmap' },
  { mode: 'step', label: 'ステップごと', to: '/roadmap?view=step' },
];

/**
 * ロードマップの並べ方の切り替え。
 * 選んだ並べ方をURLに持たせているので、再読み込みや「戻る」でも同じ表示に戻る
 */
export function ViewToggle({ mode }: { mode: RoadmapViewMode }) {
  return (
    <div
      role="group"
      aria-label="並べ方"
      className="inline-flex rounded border-[1.5px] border-ink p-0.5"
    >
      {OPTIONS.map((option) => {
        const selected = option.mode === mode;
        return (
          <Link
            key={option.mode}
            to={option.to}
            aria-current={selected ? 'true' : undefined}
            className={`rounded-sm px-3 py-1.5 text-sm leading-none transition-colors ${
              selected ? 'bg-ink font-bold text-surface' : 'text-ink hover:bg-ink/5'
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

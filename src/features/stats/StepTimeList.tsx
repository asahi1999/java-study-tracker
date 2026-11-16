import { Card } from '@/components/ui/Card';
import { formatMinutes } from '@/lib/format';

export type StepTimeItem = {
  /** 一覧の中で重複しない値 */
  key: string;
  /** 例：「① Javaの基礎」 */
  label: string;
  minutes: number;
  /** 累計に占める割合（0〜100の整数） */
  percent: number;
};

/** ステップ別の学習時間と割合。8項目あっても名前と数字を読めるよう、円グラフではなく横棒で並べる */
export function StepTimeList({ items }: { items: readonly StepTimeItem[] }) {
  const max = Math.max(0, ...items.map((item) => item.minutes));

  return (
    <Card title="ステップ別の学習時間">
      {max === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          学習ログを記録すると、どのステップに時間を使ったかがここに出ます。
        </p>
      ) : (
        <ul className="grid gap-3 sm:gap-2.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm sm:grid-cols-[15rem_minmax(0,1fr)_9.5rem]"
            >
              <span className="leading-snug">{item.label}</span>
              {/* 棒はいちばん長いステップを基準にした長さ。数字は右に書いてあるので、飾りとして扱う */}
              <span
                aria-hidden
                className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-subtle sm:order-2 sm:col-span-1"
              >
                <span
                  className="block h-full rounded-full bg-progress"
                  style={{ width: `${(item.minutes / max) * 100}%` }}
                />
              </span>
              <span className="order-2 text-right leading-snug sm:order-3">
                <span className="font-bold">{formatMinutes(item.minutes)}</span>
                <span className="ml-2 inline-block w-9 text-muted">{item.percent}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

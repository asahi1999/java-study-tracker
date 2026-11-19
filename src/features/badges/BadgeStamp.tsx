import { BADGE_ICONS, FALLBACK_BADGE_ICON } from './badgeIcons';

type BadgeStampProps = {
  id: string;
  earned: boolean;
  size?: 'md' | 'sm';
  /** 押したスタンプらしく見せるための傾き（度）。獲得したときだけ使う */
  tilt?: number;
};

const SIZES = {
  md: { outer: 'size-20 p-[3px]', icon: 'size-8' },
  sm: { outer: 'size-10 p-0.5', icon: 'size-5' },
};

/**
 * バッジの印。駅のスタンプラリーを手本に、獲得したものはインクで押したスタンプ、
 * まだのものは点線の空き枠にする。印は飾りなので、名前と条件は別に文字で出すこと
 */
export function BadgeStamp({ id, earned, size = 'md', tilt = 0 }: BadgeStampProps) {
  const Icon = BADGE_ICONS[id] ?? FALLBACK_BADGE_ICON;
  const { outer, icon } = SIZES[size];

  return (
    <span
      aria-hidden
      className={[
        'grid shrink-0 place-items-center rounded-full',
        outer,
        earned
          ? // インクの色は、ライトでは濃紺、ダークでは黄色（進捗の塗りと同じ）
            'border-[3px] border-progress bg-accent/15 text-progress'
          : 'border-2 border-dashed border-line bg-subtle/40 text-muted/60',
      ].join(' ')}
      style={earned && tilt !== 0 ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <span
        className={[
          'grid size-full place-items-center rounded-full',
          earned ? 'border border-progress/60' : '',
        ].join(' ')}
      >
        <Icon className={icon} strokeWidth={earned ? 2.25 : 1.75} />
      </span>
    </span>
  );
}

/**
 * スタンプの傾き。手で押したように少しずつ違う角度にする（-7〜7度）。
 * 表示のたびに変わらないよう、並び順から決める
 */
export function stampTilt(index: number): number {
  return ((index * 37) % 15) - 7;
}

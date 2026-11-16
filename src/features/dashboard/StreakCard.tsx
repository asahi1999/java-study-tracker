import { Card } from '@/components/ui/Card';

type StreakCardProps = {
  current: number;
  longest: number;
  /** 今日すでに学習したか */
  studiedToday: boolean;
};

/** 現在の連続学習日数と最長記録 */
export function StreakCard({ current, longest, studiedToday }: StreakCardProps) {
  return (
    <Card title="連続学習">
      <p className="leading-none">
        <span className="text-2xl font-bold">{current}日</span>
        <span className="text-sm text-muted"> / 最長 {longest}日</span>
      </p>
      <p className="mt-3 text-[13px] leading-none text-muted">
        {studiedToday ? '今日の分は記録済みです。' : `今日学習すると${current + 1}日目になります。`}
      </p>
    </Card>
  );
}

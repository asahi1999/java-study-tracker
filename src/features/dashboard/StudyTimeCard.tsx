import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatMinutes } from '@/lib/format';

type StudyTimeCardProps = {
  /** 例：「今日の学習時間」 */
  title: string;
  minutes: number;
  goalMinutes: number;
  /** 進捗バーを読み上げるための名前 */
  progressLabel: string;
};

/** 学習時間と目標の比較（今日・今週で共通） */
export function StudyTimeCard({ title, minutes, goalMinutes, progressLabel }: StudyTimeCardProps) {
  const reached = goalMinutes > 0 && minutes >= goalMinutes;
  const percent = goalMinutes > 0 ? (minutes / goalMinutes) * 100 : 0;

  return (
    <Card title={title} action={reached ? <Badge tone="green">目標達成</Badge> : undefined}>
      <p className="leading-none">
        <span className="text-2xl font-bold">{formatMinutes(minutes)}</span>
        <span className="text-sm text-muted"> / 目標 {formatMinutes(goalMinutes)}</span>
      </p>
      <ProgressBar value={percent} label={progressLabel} className="mt-3" />
    </Card>
  );
}

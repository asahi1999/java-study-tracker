import { INPUT_CLASS } from '@/components/ui/field';
import { formatWeekLabel } from '@/lib/week';
import type { Week } from '@/types';

type WeekSelectProps = {
  id: string;
  /** 選んでいる週のID。空文字は「週の指定なし」 */
  value: string;
  onChange: (weekId: string) => void;
  weeks: readonly Week[];
  className?: string;
};

/** どの週の学習かを選ぶ欄。どの週にも当てはまらない学習のために「週の指定なし」も選べる */
export function WeekSelect({ id, value, onChange, weeks, className }: WeekSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className ?? INPUT_CLASS}
    >
      <option value="">週の指定なし</option>
      {weeks.map((week) => (
        <option key={week.id} value={week.id}>
          {formatWeekLabel(week)}
        </option>
      ))}
    </select>
  );
}

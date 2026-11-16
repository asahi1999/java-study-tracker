import { formatMinutes } from '@/lib/format';
import type { StudyAverages } from '@/lib/stats';

/** 累計の学習時間と、2種類の平均。3つを1本の帯に並べる */
export function StatsSummary({ averages }: { averages: StudyAverages }) {
  const items = [
    {
      label: '累計の学習時間',
      value: formatMinutes(averages.totalMinutes),
      note: `学習した日 ${averages.studyDays}日`,
    },
    {
      label: '平均（1日あたり）',
      value: formatMinutes(averages.perDayMinutes),
      note: `開始から ${averages.periodDays}日（休止日を除く）`,
    },
    {
      label: '平均（学習した日あたり）',
      value: formatMinutes(averages.perStudyDayMinutes),
      note: '学習した日だけで割った平均',
    },
  ];

  return (
    <dl
      aria-label="学習時間のまとめ"
      className="grid divide-y divide-line rounded-md border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3.5 sm:px-5">
          <dt className="text-[13px] font-bold leading-none text-muted">{item.label}</dt>
          <dd className="mt-2 text-2xl font-bold leading-none">{item.value}</dd>
          <dd className="mt-1.5 text-xs leading-none text-muted">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}

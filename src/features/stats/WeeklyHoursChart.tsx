import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui/Card';
import { getHourTicks } from '@/lib/chart';
import { addDaysToDate } from '@/lib/date';
import { formatDateRange, formatHours, formatMinutes, formatShortDate } from '@/lib/format';
import type { WeeklyMinutes } from '@/lib/stats';

import { AXIS_TICK, CHART_COLORS } from './chartStyle';
import { ChartTooltip } from './ChartTooltip';

const MINUTES_PER_HOUR = 60;
/** 棒の上に数字を出すのは、この本数まで（多いと数字が重なる） */
const MAX_BARS_WITH_LABEL = 12;

/** 分を、小数1桁までの時間にする（90分 → 1.5） */
const toHours = (minutes: number) => Math.round((minutes / MINUTES_PER_HOUR) * 10) / 10;

/** その週（月曜〜日曜）を「11/16〜11/22」の形にする */
const weekRangeText = (weekStart: string) =>
  formatDateRange({ start: weekStart, end: addDaysToDate(weekStart, 6) });

type WeeklyHoursChartProps = {
  weeks: readonly WeeklyMinutes[];
  /** 週の目標学習時間（時間） */
  goalHours: number;
};

/** 週別（月曜始まり）の学習時間の棒グラフ。週の目標を点線で重ねる */
export function WeeklyHoursChart({ weeks, goalHours }: WeeklyHoursChartProps) {
  const data = weeks.map((week) => ({ ...week, hours: toHours(week.minutes) }));
  const hasLogs = weeks.some((week) => week.minutes > 0);
  // 目標の線が上端に張り付かないよう、目標より少し上まで目盛りを取る
  const ticks = getHourTicks(Math.max(goalHours * 1.1, ...data.map((week) => week.hours)));

  return (
    <Card title="週別の学習時間">
      {!hasLogs ? (
        <p className="text-sm leading-relaxed text-muted">
          学習ログを記録すると、週ごとの学習時間がここに棒グラフで出ます。
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-none text-muted">
            月曜から日曜までの合計（時間）。点線は週の目標 {formatHours(goalHours)}
          </p>

          <div aria-hidden className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={formatShortDate}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.line }}
                  minTickGap={12}
                />
                <YAxis
                  domain={[0, ticks.at(-1) ?? 1]}
                  ticks={ticks}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: CHART_COLORS.muted, fillOpacity: 0.12 }}
                  content={({ active, payload }) => {
                    const week = payload?.[0]?.payload as WeeklyMinutes | undefined;
                    if (!active || !week) return null;
                    return (
                      <ChartTooltip title={weekRangeText(week.weekStart)}>
                        <p>{formatMinutes(week.minutes)}</p>
                      </ChartTooltip>
                    );
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill={CHART_COLORS.progress}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={48}
                  isAnimationActive={false}
                >
                  {data.length <= MAX_BARS_WITH_LABEL && (
                    <LabelList
                      dataKey="hours"
                      position="top"
                      fontSize={11}
                      fontWeight={700}
                      fill={CHART_COLORS.ink}
                    />
                  )}
                </Bar>
                <ReferenceLine
                  y={goalHours}
                  stroke={CHART_COLORS.muted}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>週別の学習時間</caption>
            <thead>
              <tr>
                <th scope="col">週</th>
                <th scope="col">学習時間</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.weekStart}>
                  <th scope="row">{weekRangeText(week.weekStart)}</th>
                  <td>{formatMinutes(week.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui/Card';
import { getWeekTicks } from '@/lib/chart';
import { getPaceChartPoints, type Pace, type PaceChartPoint, type PaceStatus } from '@/lib/pace';
import type { Progress } from '@/lib/progress';

import { AXIS_TICK, CHART_COLORS } from './chartStyle';
import { ChartTooltip } from './ChartTooltip';

const STATUS_TEXT: Record<PaceStatus, string> = {
  ahead: '予定より進んでいます。',
  behind: '予定より遅れています。',
  on_track: '予定どおりです。',
  not_started: '学習開始日の前です。',
};

type PaceDiagramProps = {
  pace: Pace;
  status: PaceStatus;
  /** 全体の進捗（実績の数字は、ほかの画面と同じ丸め方で出す） */
  progress: Progress;
};

/**
 * 予定と実績の比較。列車のダイヤ（運行図表）に見立てて、
 * 予定を点線、実績を太い線と「駅」の丸、今日の位置を▼で示す
 */
export function PaceDiagram({ pace, status, progress }: PaceDiagramProps) {
  const { points, todayPosition, plannedNow } = pace;
  const lastWeek = points.at(-1)?.week ?? 0;
  const chartPoints = getPaceChartPoints(pace);

  return (
    <Card title="予定と実績">
      <p className="text-sm leading-relaxed">
        実績 <span className="text-lg font-bold">{progress.percent}%</span>
        {plannedNow !== null && (
          <>
            <span aria-hidden className="mx-1.5 text-muted">
              ／
            </span>
            予定 <span className="text-lg font-bold">{Math.round(plannedNow)}%</span>
          </>
        )}
        <span className="ml-3">{STATUS_TEXT[status]}</span>
      </p>

      {points.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          週を追加すると、予定と実績の進み具合をここで比べられます。
        </p>
      ) : (
        <>
          <ul aria-hidden className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
            <li className="flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-muted" />
              予定
            </li>
            <li className="flex items-center gap-2">
              <span className="relative h-[3px] w-6 rounded-full bg-progress">
                <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-accent" />
              </span>
              実績
            </li>
          </ul>

          {/* グラフは目で見るためのもの。同じ内容を、下の表で読み上げられるようにしている */}
          <div aria-hidden className="mt-2 h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                accessibilityLayer={false}
                data={chartPoints}
                margin={{ top: 22, right: 14, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="2 4" />
                <XAxis
                  dataKey="week"
                  type="number"
                  domain={[0, lastWeek]}
                  ticks={getWeekTicks(lastWeek)}
                  tickFormatter={(week: number) => `${week}週`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.line }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                />
                <Tooltip
                  cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as PaceChartPoint | undefined;
                    if (!active || !point) return null;
                    return (
                      <ChartTooltip
                        title={
                          point.isToday
                            ? '今日'
                            : point.week === 0
                              ? '開始前'
                              : `${point.week}週目の終わり`
                        }
                      >
                        <p>予定 {point.planned}%</p>
                        {point.actual !== null && <p>実績 {point.actual}%</p>}
                      </ChartTooltip>
                    );
                  }}
                />
                <Line
                  dataKey="planned"
                  type="linear"
                  stroke={CHART_COLORS.muted}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="actual"
                  type="linear"
                  stroke={CHART_COLORS.progress}
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  dot={{
                    r: 5,
                    fill: CHART_COLORS.accent,
                    stroke: CHART_COLORS.ink,
                    strokeWidth: 2.5,
                  }}
                  activeDot={{
                    r: 6,
                    fill: CHART_COLORS.accent,
                    stroke: CHART_COLORS.ink,
                    strokeWidth: 2.5,
                  }}
                  isAnimationActive={false}
                />
                {todayPosition !== null && (
                  <ReferenceLine
                    x={todayPosition}
                    stroke={CHART_COLORS.ink}
                    strokeWidth={1.5}
                    label={<TodayMarker />}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>週ごとの累計進捗率</caption>
            <thead>
              <tr>
                <th scope="col">週</th>
                <th scope="col">予定</th>
                <th scope="col">実績</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.week}>
                  <th scope="row">{point.week === 0 ? '開始前' : `${point.week}週目の終わり`}</th>
                  <td>{point.planned}%</td>
                  <td>{point.actual === null ? 'まだ' : `${point.actual}%`}</td>
                </tr>
              ))}
            </tbody>
            {plannedNow !== null && (
              <tfoot>
                <tr>
                  <th scope="row">今日</th>
                  <td>{plannedNow}%</td>
                  <td>{pace.actualNow}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </>
      )}
    </Card>
  );
}

/** 「今日」の印。路線バーの▼と同じ形にしている */
function TodayMarker({ viewBox }: { viewBox?: { x?: number; y?: number } }) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;

  return (
    <g>
      <path
        d={`M${x - 6} ${y - 12} h12 l-6 9 z`}
        fill={CHART_COLORS.accent}
        stroke={CHART_COLORS.ink}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <text x={x + 11} y={y - 3} fontSize={12} fontWeight={700} fill={CHART_COLORS.ink}>
        今日
      </text>
    </g>
  );
}

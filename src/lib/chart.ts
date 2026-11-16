// グラフの軸の目盛りを決める関数

/**
 * 「予定と実績」の横軸の目盛り（何週目か）。
 * 目盛りが詰まりすぎないよう、週数が多いときは間引く
 */
export function getWeekTicks(lastWeek: number): number[] {
  const step = lastWeek <= 16 ? 1 : lastWeek <= 32 ? 2 : Math.ceil(lastWeek / 13);
  const ticks: number[] = [];
  for (let week = step; week <= lastWeek; week += step) ticks.push(week);
  return ticks;
}

const HOUR_STEPS = [1, 2, 3, 5, 10, 20, 50];

/**
 * 学習時間の縦軸の目盛り（時間）。0 から、いちばん大きい値以上の切りのよい数まで、4〜5本になるように刻む。
 * グラフの自動の目盛りだと「0・3・6・9・11」のように間隔がそろわないことがあるため、自分で決めている
 */
export function getHourTicks(maxHours: number): number[] {
  const step = HOUR_STEPS.find((candidate) => maxHours / candidate <= 4) ?? 100;
  const top = Math.max(step, Math.ceil(maxHours / step) * step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

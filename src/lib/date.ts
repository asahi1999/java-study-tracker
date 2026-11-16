import { addDays, differenceInCalendarDays, format, isValid, parse, startOfWeek } from 'date-fns';

// このアプリでは日付を「YYYY-MM-DD」の文字列で持つ。
// この形式は文字列のまま大小を比べられる（'2026-12-31' < '2027-01-01'）ので、
// 前後の判定には比較演算子をそのまま使い、日数の計算だけ下の関数を使う

const DATE_FORMAT = 'yyyy-MM-dd';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date をローカル時刻の YYYY-MM-DD に変換する。
 * toISOString() はUTCになり、日本時間の0〜9時が前日扱いになるので使わない
 */
export function toDateString(date: Date): string {
  return format(date, DATE_FORMAT);
}

/** 今日の日付（ローカル時刻の YYYY-MM-DD） */
export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

/** YYYY-MM-DD を、ローカル時刻でその日の0時を指す Date にする */
export function parseDateString(value: string): Date {
  return parse(value, DATE_FORMAT, new Date(2000, 0, 1));
}

/** 実在する日付を表す YYYY-MM-DD かどうか（'2026-02-30' や '2026-2-3' は false） */
export function isDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = parseDateString(value);
  // 存在しない日付は別の日に繰り上がることがあるので、文字列に戻して一致するかも確かめる
  return isValid(date) && toDateString(date) === value;
}

/** 日付に日数を足す（マイナスなら引く） */
export function addDaysToDate(value: string, days: number): string {
  return toDateString(addDays(parseDateString(value), days));
}

/** later が earlier の何日後か。同じ日なら 0、later のほうが前ならマイナス */
export function diffInDays(later: string, earlier: string): number {
  return differenceInCalendarDays(parseDateString(later), parseDateString(earlier));
}

/**
 * その日を含む暦週の月曜日を返す。
 * 「今週の学習時間」や週別のグラフは、予定の週ではなく月曜始まりの暦週で集計するため
 */
export function startOfWeekMonday(value: string): string {
  return toDateString(startOfWeek(parseDateString(value), { weekStartsOn: 1 }));
}

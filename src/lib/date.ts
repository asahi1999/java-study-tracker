import { format } from 'date-fns';

/**
 * Date をローカル時刻の YYYY-MM-DD に変換する。
 * toISOString() はUTCになり、日本時間の0〜9時が前日扱いになるので使わない
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** 今日の日付（ローカル時刻の YYYY-MM-DD） */
export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { parseDateString } from './date';

/** 「11/16」のような短い日付 */
export function formatShortDate(value: string): string {
  return format(parseDateString(value), 'M/d');
}

/** 「11/16〜11/22」のような期間 */
export function formatDateRange({ start, end }: { start: string; end: string }): string {
  return `${formatShortDate(start)}〜${formatShortDate(end)}`;
}

/** 「11月16日（月）」のような曜日つきの日付 */
export function formatDateWithWeekday(value: string): string {
  return format(parseDateString(value), 'M月d日（E）', { locale: ja });
}

/** 「2026年11月19日（木）」のような、年と曜日つきの日付 */
export function formatFullDate(value: string): string {
  return format(parseDateString(value), 'yyyy年M月d日（E）', { locale: ja });
}

/** ISO形式の日時を、ローカル時刻の「2026年11月19日 9:05」にする */
export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'yyyy年M月d日 H:mm');
}

/** 学習時間（分）を「45分」「2時間」「3時間20分」のように表示する */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

/** 予定時間（時間）を「9時間」「4.5時間」のように表示する */
export function formatHours(hours: number): string {
  return `${hours}時間`;
}

const CIRCLED_ONE = 0x2460;
const CIRCLED_MAX = 20;

/** ステップの番号を丸数字（①〜⑳）にする。丸数字がない21以上は数字のまま返す */
export function formatStepNumber(order: number): string {
  if (Number.isInteger(order) && order >= 1 && order <= CIRCLED_MAX) {
    return String.fromCharCode(CIRCLED_ONE + order - 1);
  }
  return `${order}`;
}

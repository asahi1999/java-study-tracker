import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { WEEK_DISPLAY_STATUS_LABELS, type WeekDisplayStatus } from '@/lib/schedule';

const TONES: Record<WeekDisplayStatus, BadgeTone> = {
  not_started: 'gray',
  in_progress: 'blue',
  done: 'green',
  late: 'red',
};

/** 週の状態バッジ（未着手・進行中・完成・遅れ） */
export function WeekStatusBadge({ status }: { status: WeekDisplayStatus }) {
  return <Badge tone={TONES[status]}>{WEEK_DISPLAY_STATUS_LABELS[status]}</Badge>;
}

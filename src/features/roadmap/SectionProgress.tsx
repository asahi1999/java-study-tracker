import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Progress } from '@/lib/progress';

type SectionProgressProps = {
  progress: Progress;
  /** 何の進捗かを読み上げるための名前（例：「1ヶ月目の進捗」） */
  label: string;
};

/** 月・ステップの見出しに付ける進捗（バーと項目数） */
export function SectionProgress({ progress, label }: SectionProgressProps) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <ProgressBar value={progress.percent} label={label} className="w-32 sm:w-48" />
      <p className="text-[13px] leading-none text-muted">
        <span className="font-bold text-ink">{progress.percent}%</span>
        <span aria-hidden> ・ </span>
        {progress.checked} / {progress.total} 項目
      </p>
    </div>
  );
}

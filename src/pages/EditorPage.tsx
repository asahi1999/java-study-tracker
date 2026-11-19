import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonthList } from '@/features/editor/MonthList';
import { ResetRoadmapSection } from '@/features/editor/ResetRoadmapSection';
import { StepList } from '@/features/editor/StepList';
import { WeekList } from '@/features/editor/WeekList';
import { useRoadmapData } from '@/hooks/useRoadmapData';

export function EditorPage() {
  const data = useRoadmapData();

  return (
    <>
      <PageHeader
        title="ロードマップ編集"
        description="月・ステップ・週・チェック項目を追加・変更・削除できます。チェックやメモなどの記録は、週の詳細で行います。"
      />

      {!data ? (
        <LoadingText />
      ) : (
        // 週がいちばんよく編集するので先頭に置く。月とステップは週の所属先なので、その下に並べる
        <div className="grid gap-4">
          <WeekList
            months={data.months}
            steps={data.steps}
            weeks={data.weeks}
            skills={data.skills}
          />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <MonthList months={data.months} weeks={data.weeks} />
            <StepList steps={data.steps} weeks={data.weeks} />
          </div>
          <ResetRoadmapSection />
        </div>
      )}
    </>
  );
}

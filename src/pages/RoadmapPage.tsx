import { Map as MapIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { buttonClassName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROADMAP_GOAL } from '@/data/initialRoadmap';
import { RoadmapByMonth } from '@/features/roadmap/RoadmapByMonth';
import { RoadmapByStep } from '@/features/roadmap/RoadmapByStep';
import { type RoadmapViewMode, ViewToggle } from '@/features/roadmap/ViewToggle';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { buildWeekViews } from '@/lib/weekView';

export function RoadmapPage() {
  const data = useRoadmapData();
  const today = useToday();
  const [searchParams] = useSearchParams();
  const mode: RoadmapViewMode = searchParams.get('view') === 'step' ? 'step' : 'month';

  const weekViews = useMemo(
    () => (data ? buildWeekViews(data.weeks, data.skills, data.settings, today) : []),
    [data, today],
  );

  return (
    <>
      <PageHeader
        title="ロードマップ"
        description={`ゴール：${ROADMAP_GOAL}`}
        actions={<ViewToggle mode={mode} />}
      />

      {!data ? (
        <LoadingText />
      ) : data.weeks.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapIcon}
            title="週がまだありません"
            description="ロードマップ編集で、月・ステップ・週を追加できます。"
            action={
              <Link to="/editor" className={buttonClassName({ variant: 'primary' })}>
                ロードマップ編集を開く
              </Link>
            }
          />
        </Card>
      ) : mode === 'step' ? (
        <RoadmapByStep {...data} weekViews={weekViews} />
      ) : (
        <RoadmapByMonth {...data} weekViews={weekViews} />
      )}
    </>
  );
}

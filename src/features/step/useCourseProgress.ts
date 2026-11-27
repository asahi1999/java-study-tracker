// コース全体の進み具合（progress）と、「次のステップへ」の行き先
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { useServices } from '@/app/services';
import type { StepSummary } from '@/content/schema';
import { v2db } from '@/db/v2/database';
import type { Progress } from '@/db/v2/types';
import { courseSteps, stepAfter } from '@/domain/progress/nextStep';

export function useCourseProgress(): { steps: StepSummary[]; progress: Progress[] | undefined } {
  const { content } = useServices();
  const progress = useLiveQuery(() => v2db.progress.toArray(), []);
  const steps = useMemo(() => courseSteps(content.course), [content.course]);
  return { steps, progress };
}

export function useNextAfter(currentId: string): StepSummary | null {
  const { steps, progress } = useCourseProgress();
  return useMemo(() => stepAfter(steps, progress ?? [], currentId), [steps, progress, currentId]);
}

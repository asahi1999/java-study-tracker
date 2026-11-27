// 書きかけ（drafts）の読み書き（F-STEP-9）
import { v2db } from './database';
import type { Draft } from './types';

export function saveDraft(draft: Draft): Promise<string> {
  return v2db.drafts.put(draft);
}

export function getDraft(stepId: string): Promise<Draft | undefined> {
  return v2db.drafts.get(stepId);
}

export function deleteDraft(stepId: string): Promise<void> {
  return v2db.drafts.delete(stepId);
}

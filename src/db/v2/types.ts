// v2 の DB の型（設計書 3-2）。フェーズ1で使うのは meta・progress・drafts・attempts。
// ほかの表の型も、全表を version(1) で定義するために先に置く（中身を使うのは後のフェーズ）

export type StepId = string; // 'ch02.torch-row'、手元課題の段階は 'p02.walls'
export type ChapterId = string; // 'ch02'

export type ProgressKind = 'card' | 'problem' | 'project-stage';
export type ProgressStatus = 'new' | 'trying' | 'cleared';

export type Progress = {
  stepId: StepId;
  chapterId: ChapterId;
  kind: ProgressKind;
  /** trying になるのは、コードを変えたか実行したか答えたとき（開いただけでは変わらない） */
  status: ProgressStatus;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  clearedAt: string | null;
  clearedRev: number | null;
  attemptCount: number;
  maxHint: 0 | 1 | 2 | 3;
  activeSeconds: number;
  points: number;
  showcase: { code: Record<string, string>; output: string } | null;
  localStartedAt: string | null;
};

export type AttemptResult =
  | 'pass'
  | 'fail'
  | 'compile-error'
  | 'runtime-error'
  | 'timeout'
  | 'output-limit'
  | 'crash'
  | 'wrong-answer'
  | 'internal-error';

export type Attempt = {
  id: string;
  stepId: StepId;
  at: string;
  rev: number;
  result: AttemptResult;
  passed: number;
  total: number;
  where: 'browser' | 'local' | 'none';
  errorIds: string[];
  durationMs: number | null;
};

export type Draft = {
  stepId: StepId;
  /** 書き始めたときの教材の rev。今の rev と違えば知らせる（F-STEP-13） */
  rev: number;
  files: Record<string, string>;
  cursorLine: number | null;
  updatedAt: string;
};

export type Session = {
  id: string;
  kind: 'app' | 'local';
  startedAt: string;
  endedAt: string;
  activeSeconds: number;
  day: string;
  weekStart: string;
  stepId: StepId | null;
};

export type DexEntry = {
  errorId: string;
  discoveredAt: string;
  discoveredStepId: StepId;
  discoveredExcerpt: string;
  capturedAt: string | null;
  capturedStepId: StepId | null;
  capturedExcerpt: string | null;
};

export type TechCard = {
  conceptId: string;
  rank: 'bronze' | 'silver' | 'gold';
  bronzeAt: string;
  silverAt: string | null;
  goldAt: string | null;
  lastCorrectAt: string;
};

export type Review = { stepId: StepId; box: 1 | 2 | 3 | 4 | 5; due: string; lastAt: string };
export type RestWeek = { weekStart: string; createdAt: string };
export type Chest = {
  id: string;
  openedAt: string;
  gapDays: number;
  grade: 'wood' | 'silver' | 'gold';
  gift: string | null;
};
export type Note = { id: string; stepId: StepId | null; text: string; createdAt: string };

/** 旧記録（v1 の DB を読んだもの。フェーズ3） */
export type Legacy = {
  key: 'v1';
  source: 'indexeddb' | 'json';
  importedAt: string;
  valid: boolean;
  data: unknown | null;
  raw: unknown | null;
  summary: { logCount: number; totalMinutes: number; memoCount: number; badgeCount: number };
};

export type Theme = 'light' | 'dark' | 'system';

export type MetaApp = {
  key: 'app';
  createdAt: string;
  lastActiveAt: string;
  lastContentVersion: string;
};
export type MetaSettings = {
  key: 'settings';
  theme: Theme;
  tileSize: 16 | 24 | 32;
  skins: Record<string, string>;
};
export type MetaMigration = {
  key: 'migration';
  status: 'done' | 'not-found' | 'failed';
  at: string;
  error: string | null;
  hasLegacy: boolean;
};
export type MetaWelcome = {
  key: 'welcome';
  pendingChest: { gapDays: number; grade: 'wood' | 'silver' | 'gold' } | null;
  pendingReview: boolean;
  at: string;
};
export type MetaOnboarding = {
  key: 'onboarding';
  installCardDismissedAt: string | null;
  setupDoneAt: string | null;
};
export type MetaJava = {
  key: 'java';
  support: 'unknown' | 'ok' | 'unsupported';
  checkedAt: string;
  detail: string | null;
};
export type MetaShortcut = { key: 'shortcut'; enabled: boolean; at: string };

export type Meta =
  MetaApp | MetaSettings | MetaMigration | MetaWelcome | MetaOnboarding | MetaJava | MetaShortcut;
export type MetaKey = Meta['key'];

/** ロードマップの「月」。1ヶ月ごとのマイルストーンを持つ */
export type Month = {
  id: string;
  /** 表示順（1, 2, 3） */
  order: number;
  /** 例：「1ヶ月目」 */
  title: string;
  milestone: string;
};

/** 学習ステップ（①〜⑧） */
export type Step = {
  id: string;
  /** 表示順（1〜8） */
  order: number;
  /** 例：「Javaの基礎」 */
  title: string;
  /** 学ぶ内容 */
  description: string;
  /** 学習のアドバイス */
  advice: string;
};

export type WeekStatus = 'not_started' | 'in_progress' | 'done';

/**
 * ロードマップの1単位。「5〜6週目」のように複数週にまたがることがあるため、
 * weekStart / weekEnd で期間を持つ
 */
export type Week = {
  id: string;
  /** 表示順 */
  order: number;
  monthId: string;
  stepId: string;
  /** 何週目から（例：5） */
  weekStart: number;
  /** 何週目まで（例：6） */
  weekEnd: number;
  /** 作るもの */
  title: string;
  /** 予定学習時間（時間） */
  plannedHours: number;
  status: WeekStatus;
  /** GitHubリポジトリURL。未登録は空文字 */
  repoUrl: string;
  /** 実際の開始日 YYYY-MM-DD */
  startedAt: string | null;
  /** 実際の完了日 YYYY-MM-DD */
  completedAt: string | null;
  /** Markdown */
  memo: string;
};

/** 身につくこと（週ごとのチェック項目） */
export type Skill = {
  id: string;
  weekId: string;
  /** 週の中での表示順 */
  order: number;
  label: string;
  checked: boolean;
  /** チェックした日 YYYY-MM-DD */
  checkedAt: string | null;
};

export type StudyLogSource = 'timer' | 'manual';

export type StudyLog = {
  id: string;
  /** 学習した日 YYYY-MM-DD */
  date: string;
  /** 学習時間（1〜1440分） */
  minutes: number;
  /** 週を削除してもログは残すため null を許可する */
  weekId: string | null;
  /** やったこと */
  content: string;
  source: StudyLogSource;
  /** 記録した日時（ISO形式） */
  createdAt: string;
};

export type EarnedBadge = {
  /** バッジ定義のID */
  id: string;
  /** 獲得した日時（ISO形式） */
  earnedAt: string;
};

/** 休止期間（年末年始など）。スケジュール計算から除外する */
export type BreakPeriod = {
  id: string;
  label: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
};

export type Theme = 'light' | 'dark' | 'system';

export type Settings = {
  /** 設定は1件だけなので固定のキーにする */
  id: 'app';
  /** 学習開始日 YYYY-MM-DD */
  startDate: string;
  theme: Theme;
  weeklyGoalHours: number;
  dailyGoalMinutes: number;
  breakPeriods: BreakPeriod[];
  schemaVersion: number;
};

/** ロードマップを構成するデータ一式 */
export type RoadmapData = {
  months: Month[];
  steps: Step[];
  weeks: Week[];
  skills: Skill[];
};

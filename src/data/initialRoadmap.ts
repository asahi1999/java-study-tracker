import type { Month, RoadmapData, Skill, Step, Week } from '@/types';

/** ロードマップの最終ゴール */
export const ROADMAP_GOAL = 'ブラウザで使える単語帳アプリ（Spring Boot＋DB）をGitHubに公開する';

/** 進め方のルール（ダッシュボードの下部に表示する） */
export const ROADMAP_RULES: readonly string[] = [
  '作ったものは1つずつGitHubのリポジトリに載せる（単語帳だけは同じリポジトリで育てる）',
  'Gitは1週目から使う',
  '年末年始は遅れる前提で、休止期間に登録しておく',
  '早く終わったら、次に進む前に機能を1つ足してみる',
];

const MONTHS: readonly Month[] = [
  {
    id: 'month-1',
    order: 1,
    title: '1ヶ月目',
    milestone: '基本文法とHTML/CSSを使って、小さなアプリを最後まで作れる',
  },
  {
    id: 'month-2',
    order: 2,
    title: '2ヶ月目',
    milestone: 'オブジェクト指向で設計し、データをDBに保存できる',
  },
  {
    id: 'month-3',
    order: 3,
    title: '3ヶ月目',
    milestone: 'Spring BootでWebアプリを作り、GitHubに公開できる',
  },
];

const STEPS: readonly Step[] = [
  {
    id: 'step-1',
    order: 1,
    title: 'Javaの基礎',
    description: '基本構文、データ型、制御構文（if・for・while）',
    advice: '基本の書き方を確実に身につける',
  },
  {
    id: 'step-2',
    order: 2,
    title: 'HTML・CSS',
    description: 'Webページの構造とレイアウト',
    advice: '時間をかけすぎず短期間で集中して学ぶ',
  },
  {
    id: 'step-3',
    order: 3,
    title: '簡単なアプリ作成',
    description: '基礎を使った小さなアプリ開発',
    advice: '作りながら開発の流れをつかむ',
  },
  {
    id: 'step-4',
    order: 4,
    title: 'オブジェクト指向',
    description: 'クラス、インスタンス、インターフェース、ポリモーフィズム、カプセル化',
    advice: 'Javaの設計の考え方として理解する',
  },
  {
    id: 'step-5',
    order: 5,
    title: 'データベース（SQL）',
    description: 'データの登録・更新・削除・検索',
    advice: '短期間で集中して基本操作を覚える',
  },
  {
    id: 'step-6',
    order: 6,
    title: 'ライブラリ・フレームワーク',
    description: 'Spring Bootの基本',
    advice: 'Java開発の主流なので基本操作を習得する',
  },
  {
    id: 'step-7',
    order: 7,
    title: 'Git・コマンド',
    description: 'バージョン管理と基本コマンド',
    advice: '1週目から使い、11週目で応用を学ぶ',
  },
  {
    id: 'step-8',
    order: 8,
    title: 'Webアプリの実開発',
    description: '学んだことを組み合わせたWebアプリ開発',
    advice: '試行錯誤しながら完成まで作り切る',
  },
];

/** 週とチェック項目をまとめて書くための定義。表示順は配列の並び順から決める */
type WeekSeed = {
  id: string;
  monthId: string;
  stepId: string;
  weekStart: number;
  weekEnd: number;
  title: string;
  plannedHours: number;
  skills: readonly string[];
};

// 予定時間は1週あたり9時間。11週目は⑦と⑧が並行するので、
// 合計が 12週 × 9時間 = 108時間 になるよう ⑦4.5時間／⑧13.5時間 に分けている
const WEEK_SEEDS: readonly WeekSeed[] = [
  {
    id: 'week-01',
    monthId: 'month-1',
    stepId: 'step-1',
    weekStart: 1,
    weekEnd: 1,
    title: '数当てゲーム',
    plannedHours: 9,
    skills: ['変数', 'データ型', 'if', 'for/while', 'Scanner', 'Random'],
  },
  {
    id: 'week-02',
    monthId: 'month-1',
    stepId: 'step-1',
    weekStart: 2,
    weekEnd: 2,
    title: 'じゃんけんゲーム（勝敗を記録）',
    plannedHours: 9,
    skills: ['メソッド分割', '配列', 'enum'],
  },
  {
    id: 'week-03',
    monthId: 'month-1',
    stepId: 'step-2',
    weekStart: 3,
    weekEnd: 3,
    title: '自己紹介ページ',
    plannedHours: 9,
    skills: ['HTMLの構造', 'CSSのレイアウト', 'フォーム'],
  },
  {
    id: 'week-04',
    monthId: 'month-1',
    stepId: 'step-3',
    weekStart: 4,
    weekEnd: 4,
    title: 'コンソール版ToDoリスト',
    plannedHours: 9,
    skills: ['ArrayList', '機能の分割', '開発の流れ'],
  },
  {
    id: 'week-05-06',
    monthId: 'month-2',
    stepId: 'step-4',
    weekStart: 5,
    weekEnd: 6,
    title: '単語帳アプリ（ファイル保存）',
    plannedHours: 18,
    skills: [
      'クラス',
      'インスタンス',
      'カプセル化',
      'インターフェース',
      'ポリモーフィズム',
      '例外処理',
      'JUnit',
    ],
  },
  {
    id: 'week-07',
    monthId: 'month-2',
    stepId: 'step-5',
    weekStart: 7,
    weekEnd: 7,
    title: 'SQL練習（単語テーブルの操作）',
    plannedHours: 9,
    skills: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WHERE', 'ORDER BY'],
  },
  {
    id: 'week-08',
    monthId: 'month-2',
    stepId: 'step-5',
    weekStart: 8,
    weekEnd: 8,
    title: '単語帳の保存先をDBに変更',
    plannedHours: 9,
    skills: ['MySQL/PostgreSQL', 'JDBC'],
  },
  {
    id: 'week-09-10',
    monthId: 'month-3',
    stepId: 'step-6',
    weekStart: 9,
    weekEnd: 10,
    title: '単語帳のWeb版（一覧・追加・編集・削除）',
    plannedHours: 18,
    skills: ['Spring Bootの基本', 'Thymeleaf', 'Spring Data JPA', 'CRUD'],
  },
  {
    id: 'week-11-git',
    monthId: 'month-3',
    stepId: 'step-7',
    weekStart: 11,
    weekEnd: 11,
    title: 'ブランチを切って機能追加',
    plannedHours: 4.5,
    skills: ['git status/diff/add/commit/push', 'ブランチ', 'プルリクエスト'],
  },
  {
    id: 'week-11-12',
    monthId: 'month-3',
    stepId: 'step-8',
    weekStart: 11,
    weekEnd: 12,
    title: '単語帳を完成させて公開',
    plannedHours: 13.5,
    skills: ['テスト機能（ランダム出題）', '検索', 'README作成'],
  },
];

/**
 * 初期ロードマップを新しいオブジェクトとして作る。
 * 定数をそのまま渡すと、呼び出し側の変更が初期データに混ざるため毎回作り直す
 */
export function createInitialRoadmap(): RoadmapData {
  const weeks: Week[] = WEEK_SEEDS.map((seed, index) => ({
    id: seed.id,
    order: index + 1,
    monthId: seed.monthId,
    stepId: seed.stepId,
    weekStart: seed.weekStart,
    weekEnd: seed.weekEnd,
    title: seed.title,
    plannedHours: seed.plannedHours,
    status: 'not_started',
    repoUrl: '',
    startedAt: null,
    completedAt: null,
    memo: '',
  }));

  const skills: Skill[] = WEEK_SEEDS.flatMap((seed) =>
    seed.skills.map((label, index) => ({
      id: `${seed.id}-skill-${index + 1}`,
      weekId: seed.id,
      order: index + 1,
      label,
      checked: false,
      checkedAt: null,
    })),
  );

  return {
    months: MONTHS.map((month) => ({ ...month })),
    steps: STEPS.map((step) => ({ ...step })),
    weeks,
    skills,
  };
}

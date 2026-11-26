# 設計書：Java 学習アプリ v2（java-study-tracker 全面改修）

- 作成: 2026-11-27（設計担当）
- 要件: [02-requirements.md](02-requirements.md)（機能 ID はここを参照）
- 優先順位: [01-decisions.md](01-decisions.md) ＞ 本書 ＞ [reviews/critic-tech.md](reviews/critic-tech.md)
- 表記
  - 「未確認」= 確かめていない。確かめ方は15章
  - 「（実測）」= 2026-11-27 に手元の JDK 25.0.5、teavm-javac（teavm.org/playground/4 の配布物）、Node 24.15.0 で確かめた
- アプリ名は仮に「Java ダンジョン工房」。リポジトリ名・URL（`https://asahi1999.github.io/java-study-tracker/`）は変えない

---

## 0. 設計の要点

- 画面は React 18 + TS + Vite + Tailwind 3（v1 を継続）。データは Dexie の新しい DB `java-study-tracker-v2`
- Java はブラウザ内で teavm-javac を Web Worker で動かす。判定は **ブラウザ・手元・CI で同じ Java のハーネス**を使う
- 教材は1問1フォルダの本物の `.java`。CI で JDK 25 と teavm-javac の両方で実行し、出力の一致を確かめる
- 世界観（ダンジョン）は見た目の皮だけ。データ・判定・ID に持ち込まない（例: タイルの名前は描画だけで使う）
- 計算（次のステップ、レベル、見込み、クリアコード、タイル、移行）は `src/domain/` の純粋関数

### 全体の構成

```
[教材 content/] --content-build--> [src/content/generated/*.json] --Vite--> [画面]
      |                                                                       |
      +--content-verify--> JDK 25（javac/java） と teavm-javac（Node） で実行して比較
      |
      +--workspace-build--> [public/java-quest/*.zip]（手元課題の作業フォルダ）

[画面（メインスレッド）]
   JavaRunner --> compile.worker（常駐: javac + TeaVM）--> app.wasm
              --> run.worker（毎回新規: app.wasm を実行。時間切れで terminate）
   Dexie（java-study-tracker-v2） <-- 起動時に1回だけ v1 の DB（java-study-tracker）を読む
   Service Worker（vite-plugin-pwa）: アプリ本体は事前キャッシュ、teavm-javac は初回利用時にキャッシュ
```

---

## 1. 画面

### 1-1. 画面一覧

| 画面             | URL（HashRouter）                     | 要件                           | 区分 |
| ---------------- | ------------------------------------- | ------------------------------ | ---- |
| ホーム           | `#/`                                  | F-HOME-1〜6、F-BACK、F-REST    | MVP  |
| ステップ         | `#/step/:stepId`                      | F-STEP、F-RUN、F-TILE、F-ASK   | MVP  |
| 手元課題         | `#/project/:projectId`                | F-PROJ                         | MVP  |
| 地図             | `#/map`                               | F-MAP-1、F-FC-1                | MVP  |
| 作品             | `#/works`                             | F-WORK                         | MVP  |
| 図鑑             | `#/dex`（タブ: 技カード／エラー）     | F-CARD、F-DEX                  | MVP  |
| 記録             | `#/journal`（タブ: この記録／旧記録） | F-LOG                          | MVP  |
| 設定             | `#/settings`                          | F-SET、F-DATA                  | MVP  |
| 準備の手順       | `#/setup`                             | F-SETUP-1                      | MVP  |
| ライセンス       | `#/licenses`                          | F-SET-3                        | MVP  |
| クリアの受け取り | `#/clear/:code`                       | F-PROJ-6                       | 後続 |
| Java の動作確認  | `#/dev/java`                          | 開発用（本番ビルドに入れない） | MVP  |
| 見つからない     | `*`                                   | v1 の NotFoundPage を流用      | MVP  |

### 1-2. 画面遷移

```
               +--------------------- ヘッダーのナビ（どの画面からも） ---------------------+
               |   地図  作品  図鑑  記録  設定                                              |
               v                                                                             |
[ホーム] --つづける--> [ステップ] --クリア--> 次のステップ（同じ画面で切り替え）
   |  \                    |  \--ここでやめる--> [ホーム]
   |   \--持ち時間30分以上--> [手元課題] --貼る--> クリア表示 --> [ホーム]
   |--宝箱（7日以上空いた）--> 宝箱のモーダル --> 易しい解き直し（[ステップ]）
   |--インストールのカード--> [準備の手順]
[地図] --> [ステップ] / [手元課題]
[設定] --> [準備の手順] / [ライセンス] / エクスポート・インポート（モーダル）
[記録] --旧記録タブ--> v1 の週のメモ（Markdown、読むだけ）
```

- ナビは PC では上部の横並び、スマホ幅（< 768px）では下部のバー（v1 の BottomNav を作り直す）
- ステップ画面ではヘッダーを細くし、作業の邪魔をしない

### 1-3. ワイヤーフレーム（文字）

#### ホーム

```
+--------------------------------------------------------------------------------+
| Java ダンジョン工房        Lv 4 [####----] あと12点     地図 作品 図鑑 記録 設定 |
+--------------------------------------------------------------------------------+
|  次のステップ   第2章 条件とくりかえし   3 / 16                                 |
|  +--------------------------------------------------------------------------+  |
|  | 松明を並べる                                        絵 ・ 約3分            |  |
|  | 部屋の上の壁に、2マスおきに松明 * を置いてください。                       |  |
|  | for 文の i が偶数のときだけ * を出します。                                 |  |
|  |                                                       [ > つづける ]       |  |
|  +--------------------------------------------------------------------------+  |
|  持ち時間（押さなくてよい）  [ 5分 ] [ 15分 ] [ 30分以上 ]                     |
|                                                                                |
|  +-- 作品 v0.2 ----------------+   +-- 手元課題 --------------------------+    |
|  | （最新のタイル絵の縮小）     |   | p02 部屋ジェネレーター 段階 1/3       |    |
|  +-----------------------------+   | 約20分  [ VS Code で始める ]          |    |
|                                    +---------------------------------------+    |
|  [ 今週は Java を休む ]                                  Java: 準備完了       |
+--------------------------------------------------------------------------------+
```

- 「次のステップ」のカードは、問題文の冒頭3行までを出す（クリック0回で読める）
- 宝箱があるときは、カードの上に「おかえり。宝箱があります [開ける]」を出す
- 「今週は休む」を押した週は、ボタンが「今週は休みにしています [取り消す]」に変わる。ほかに表示は変えない
- 「Java: 準備中 37%」「Java: このブラウザでは動きません [詳しく]」は右下に小さく

#### ステップ（穴埋め・修理・実装・絵）

```
+--------------------------------------------------------------------------------+
| < 地図   第2章 3/16  松明を並べる（絵・約3分）                    [問題を報告] |
+----------------------------------+---------------------------------------------+
| 問題文（Markdown）                | Main.java                      [ひな形に戻す]|
|                                  | +-----------------------------------------+ |
| 目標の絵（影）                    | | void main() {                           | |
|  ......                          | |     for (int i = 0; i < 8; i++) {       | |
|  ..*.*.                          | |         // ここを書く                   | |
|                                  | +-----------------------------------------+ |
| ヒント  [1] [2] [3]               | [ > 実行  Cmd+Enter ]   [ 手元で実行 ]      |
|  1: i % 2 を使います              | 松明  [火][火][  ]  2 / 3                    |
|                                  | +-- 出力  (タイル | 文字) -------------------+ |
| [ 質問文を作る ]                  | | （タイル）                                | |
|                                  | +-------------------------------------------+ |
|                                  | 「幅10」  期待と実際の差分（行ごと）        |
|                                  | ブラウザの Java は本物と細部が違うことがある |
+----------------------------------+---------------------------------------------+
| クリア後: 解説 / +4点 Lv 4→5 / 技カード「for 文」銅 / [ つづける ] [ ここでやめる ] |
+--------------------------------------------------------------------------------+
```

- 幅 1024px 未満では、問題文 → エディタ → 結果の縦並び
- コンパイルエラー: 出力の場所に「3行目: `';' expected`」と日本語の説明（エラー図鑑の項目）。エディタの該当行に印
- 「質問文を作る」は、同じステップで2回失敗かエラーのとき、枠を光らせる（いつでも押せる）

#### ステップ（説明カード・予想・クイズ）

```
+----------------------------------+---------------------------------------------+
| 説明カード: 説明（Markdown）      | 例のコード（編集できる、保存しない）        |
|                                  | [ > 動かしてみる ]  出力                    |
|                                  |                          [ わかった ]       |
+----------------------------------+---------------------------------------------+
| 予想: 問題文                      | 読むだけのコード（読み取り専用）            |
|                                  | 出力を予想して入力: [複数行の入力欄]        |
|                                  |   または 選択肢 ( ) A  ( ) B  ( ) C         |
|                                  | [ 答える ] → 正誤、実際の出力、差分         |
|                                  | [ 動かして確かめる ]（答えたあと）          |
+----------------------------------+---------------------------------------------+
```

#### 手元課題

```
+--------------------------------------------------------------------------------+
| < ホーム   手元課題 p02 部屋ジェネレーター（第2章）                             |
+--------------------------------------------------------------------------------+
| 段階  [1 床を描く: 済] [2 壁で囲む: いまここ] [3 大きさと松明: 未]              |
|                                                                                |
| 段階2 壁で囲む（約20分）                                                       |
|  やること（Markdown）、目標の出力（タイル）、ヒント [1][2][3]                  |
|                                                                                |
| 1. 作業フォルダ  ~/java-quest/ch02   [全章の zip] [第2章だけの zip]            |
|    （初めてなら [準備の手順] へ）                                              |
| 2. [ VS Code で始める ]  → 押した時刻を記録                                    |
| 3. VS Code で Room.java を書いて Cmd+Shift+B                                   |
| 4. 結果を貼る: [ クリアコード、またはターミナルの出力まるごと        ]         |
|    かかった時間 [ 34 ] 分（「始める」からの経過。直せる）   [ 記録する ]       |
|                                                                                |
| [ 質問文を作る ]（貼った出力の失敗行が入る）                                   |
+--------------------------------------------------------------------------------+
```

#### 地図

```
+--------------------------------------------------------------------------------+
| 地図                                                                           |
| 第0章 はじめの一歩   [済][済][済]...[済]   手元の準備 [済]                      |
| 第1章 変数と計算     [済][済][今]...[ ]    p01 [1済][2 ][3 ]                     |
| 第2章 ...            （準備中の章は灰色で題名だけ）                              |
| ----                                                                           |
| このペースなら 2月14日ごろ（3月は予備）   ※休みにした週は計算に入れない        |
+--------------------------------------------------------------------------------+
```

- 各マスはステップへのリンク（題名を title と aria-label に入れる）。鍵はかけない
- おかわりのステップは点線の枠

#### 作品

```
+--------------------------------------------------------------------------------+
| 作品  ちいさなダンジョン v0.3                                                  |
| 第0章 入口       [自分の出力のタイル絵]  [ ]                                    |
| 第1章 ステータス [タイル絵]                                                    |
| 第3章 マップ     [タイル絵]   飾り: [旗] [青い松明]（宝箱から）                 |
| 絵をクリック → そのときの自分のコード（読み取り専用）と出力                     |
+--------------------------------------------------------------------------------+
```

#### 図鑑

```
| 技カード (12/50)  | エラー図鑑 (5/12)                                            |
| [for 文 銅] [if 文 銅] [?] ...                                                  |
| エラー: 「;忘れ」 発見 12/3 第0章「看板」 / 捕獲 12/3  [出会ったコード][直したコード] |
| 未発見は「？」と、出会いやすい章だけ出す                                       |
```

#### 記録

```
| この記録 | 旧記録（v1）                                                        |
| 週ごと: 11/30〜 2時間10分（クリア 14）  12/7〜 休み  ...                        |
| 旧記録: これまで 23時間 / 週のメモ（Markdown） / リポジトリ URL / 旧バッジ      |
```

- 週ごとの合計は数字だけ。グラフ・目標・前週比は出さない

#### 設定

```
| テーマ: (ライト)(ダーク)(システム)    タイルの大きさ: 16 / 24 / 32            |
| 質問文の要望の既定: ヒントだけ / 説明して / 答えも                             |
| Java 実行環境: 準備完了（teavm-javac 0.17.0-pg4、オフライン用に保存済み）      |
|   [もう一度ダウンロード]  対応ブラウザの説明                                   |
| 休みの週: 2027-01-11 の週 [取り消す]  [週を追加]                               |
| データ: [エクスポート] [インポート]  v1 からの移行: 済（12/1 09:12）           |
| アプリの更新: [更新する]（あるときだけ）   [準備の手順] [ライセンス]  版 2.0.0  |
```

---

## 2. ディレクトリ構成

### 2-1. v2 の構成

```
content/                         # 教材（7章の形式）
  course.yaml                    # 章の順番・題・使ってよい文法・作品の版
  concepts.yaml                  # 技カード
  errors.yaml                    # エラー図鑑
  decorations.yaml               # 宝箱の飾り
  ch00/<slug>/ ... ch09/<slug>/  # 小問・説明カード（1つ1フォルダ）
  projects/p00/ ... p09/         # 手元課題
  errors-fixtures/<errorId>.java # エラー図鑑の判定を確かめるコード
java/
  JDK_VERSION                    # CI と同じ JDK の版（25.0.5）
  harness/                       # 判定の共通クラス（6章）
  harness-browser/StdinBridge.java
  harness-jdk/StdinBridge.java
  shim/src/java.base/java/util/  # Scanner・InputMismatchException の代わり
  workspace/                     # 作業フォルダのひな形（README、.vscode、Check.java の型）
  test-vectors/                  # 外枠・クリアコードの共通テストデータ（JSON）
public/
  java/teavm-javac/0.17.0-pg4/   # 固定した teavm-javac ＋ SHA256SUMS ＋ SOURCE.md
  java/jq-shim/1/                # Scanner を足した classlib、代わりのクラス ＋ SHA256SUMS
  icons/                         # PWA のアイコン
  favicon.svg
scripts/
  content-build.ts               # 教材 → JSON（JDK 不要）
  content-verify.ts              # JDK と teavm-javac で実行して確かめる
  workspace-build.ts             # 作業フォルダの zip
  classlib-patch.ts              # 代わりの Scanner を classlib に足す（JDK が必要）
  teavm-verify.ts                # SHA256SUMS の照合
  fetch-teavm-javac.ts           # 更新するときだけ使う
  lib/                           # JDK の呼び出し、teavm の Node 実行、並列実行、キャッシュ
src/
  app/                           # App.tsx、routes.tsx、layout/（Header・Nav・AppLayout）
  features/
    home/ step/ project/ map/ works/ dex/ journal/ settings/ setup/ licenses/
  domain/                        # 純粋関数（React・Dexie・Worker に依存しない）
    java/        wrap.ts protocol.ts diagnostics.ts jqCheckFile.ts
    judge/       normalize.ts diff.ts predict.ts
    tiles/       tileTable.ts layout.ts
    progress/    nextStep.ts level.ts cards.ts dex.ts chest.ts forecast.ts week.ts
    project/     clearCode.ts checkOutput.ts
    ask/         askText.ts
    migration/   v1ToV2.ts
    backup/      v2Backup.ts
  runtime/java/
    JavaRunner.ts                # 画面が使う型（差し替え口）
    teavmRunner.ts               # 本物の実装（Worker を管理）
    fakeRunner.ts                # 画面のテスト用
    compile.worker.ts run.worker.ts
    core/                        # Worker から切り離した処理（Node のテストで本物を動かす）
    support.ts prefetch.ts
  content/
    schema.ts                    # Zod（スクリプトと画面で共有）
    loader.ts                    # 章ごとの JSON を動的 import
    generated/                   # content-build の出力（git に入れない）
  db/
    database.ts                  # v2 の Dexie
    repositories/                # 表ごとの読み書き
    v1/v1Database.ts             # v1 を読むだけ
    v1/v1Schema.ts               # v1 の lib/backup.ts の Zod を移したもの
    persistence.ts themeCache.ts # v1 から
  components/ ui/（v1 から） editor/（CodeMirror） tiles/（TileView） torch/（松明）
  hooks/ stores/ lib/
tests/
  setup.ts factories.ts matchMedia.ts time.ts
  fixtures/v1-backup.json        # 作った v1 データ（利用者のものではない）
  content-fixtures/              # わざと壊した教材（content-verify のテスト）
  e2e/                           # Playwright
THIRD_PARTY_NOTICES.md
playwright.config.ts
```

### 2-2. v1 から消す・残す・作る

- 01-decisions.md により v1 の画面とロジックは消してよい。消すのはフェーズ3（13章）

| 区分       | v1 のファイル                                                                                                                                                                                                                 | 扱い                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 残す       | `src/lib/date.ts` `format.ts` `theme.ts`、`src/hooks/useTheme.ts` `useNow.ts` `useToday.ts`、`src/db/persistence.ts` `themeCache.ts`、`src/stores/toastStore.ts`                                                              | そのまま（テストも残す）                                       |
| 残す       | `src/components/ui/*`（Button・Card・Modal・ConfirmDialog・ErrorScreen・LoadingScreen・LoadingText・EmptyState・PageHeader・ProgressBar・Badge・FormField・field.ts）                                                         | そのまま。`ProgressRing`・`PagePlaceholder` は使わなければ消す |
| 残す       | `src/components/layout/Toaster.tsx`、`src/pages/NotFoundPage.tsx`                                                                                                                                                             | `src/app/` に移す                                              |
| 作り直す   | `src/components/layout/AppLayout` `Header` `Sidebar` `BottomNav` `BrandMark` `navigation.ts`                                                                                                                                  | ナビの項目が変わる                                             |
| 作り直す   | `src/App.tsx`、`src/hooks/useAppBootstrap.ts`、`src/db/database.ts`、`src/types/index.ts`                                                                                                                                     | v2 用                                                          |
| 移す       | `src/lib/backup.ts` の v1 の Zod スキーマ → `src/db/v1/v1Schema.ts`、`src/lib/validation.ts`（repoUrl）、`src/data/badges.ts`（旧バッジの名前）                                                                               | 旧記録の読み込み・表示だけに使う                               |
| 作り直す   | `src/features/settings/ThemeSetting` `ExportData` `ImportData`                                                                                                                                                                | v2 のデータで                                                  |
| 参考にする | `src/hooks/useAutoSave.ts`                                                                                                                                                                                                    | 書きかけの自動保存の作りを流用                                 |
| 消す       | `src/pages/*`（NotFound 以外）、`src/features/{dashboard,roadmap,week,timer,logs,stats,badges,editor}/`、`src/features/settings/{BreakPeriodSettings,ScheduleSettings,ResetAllData}`                                          | ロードマップ・タイマー・統計など                               |
| 消す       | `src/lib/{streak,schedule,pace,progress,weekView,weekStatus,week,rail,heatmap,chart,stats,timer,badges,reorder,roadmapReset,logFilter,editorValidation,settingsValidation}.ts` とテスト                                       | 連続日数・遅れ・統計など                                       |
| 消す       | `src/db/seed.ts`、`src/db/repositories/*`、`src/db/services/*`、`src/data/initialRoadmap.ts`、`src/stores/timerStore.ts`、`src/hooks/{useBadgeWatcher,useRoadmapData}.ts`、`src/components/layout/{LineRail,TimerWidget}.tsx` | v1 のデータの操作                                              |
| 消す       | 依存 `recharts`                                                                                                                                                                                                               | グラフを使わない                                               |
| 残す       | `docs/SPEC.md`（v1 の仕様。履歴として）、`.github/workflows/deploy.yml`（変更なし）                                                                                                                                           |                                                                |
| 作る       | 2-1 の `content/` `java/` `scripts/` `src/{domain,runtime,content}`、`public/java/`、`tests/e2e/`、`THIRD_PARTY_NOTICES.md`、`playwright.config.ts`                                                                           |                                                                |
| 足す依存   | `@codemirror/lang-java` `codemirror`（または `@codemirror/view` ほか）、`vite-plugin-pwa`、`yaml`、`fflate`、開発用 `@playwright/test`                                                                                        | 版は導入時に `npm view` で確かめて固定（v1 と同じく `^` なし） |

- スクリプトは TypeScript のまま Node 24 で直接動かす（型の除去。`node scripts/x.ts` が動くことを実測）
  - 決まり: スクリプトと、スクリプトが読む `src/` のファイル（`content/schema.ts`・`domain/`）では、`enum` など型の除去でできない書き方を使わない（`tsconfig` の `erasableSyntaxOnly`）。相対パスの import に `.ts` を付ける（`allowImportingTsExtensions`）。`@/` の別名を使わない

---

## 3. データモデル

### 3-1. Dexie（DB 名 `java-study-tracker-v2`）

```ts
export const DB_NAME = 'java-study-tracker-v2';
export const V1_DB_NAME = 'java-study-tracker';
export const EXPORT_SCHEMA_VERSION = 2;

this.version(1).stores({
  meta: '&key',
  progress: '&stepId, chapterId, status, clearedAt',
  attempts: '&id, stepId, at',
  drafts: '&stepId, updatedAt',
  sessions: '&id, startedAt, weekStart',
  dex: '&errorId, discoveredAt',
  cards: '&conceptId, rank',
  reviews: '&stepId, due', // 後続（F-REV-1）。表だけ先に作る
  restWeeks: '&weekStart',
  chests: '&id, openedAt',
  notes: '&id, stepId, createdAt', // 後続（F-ASK-4）
  legacy: '&key',
});
// スキーマを変えるときは version(1) を書き換えず version(2) を足す（v1 と同じ決まり）
```

- ID は `crypto.randomUUID()`（v1 と同じ。インポートで混ぜやすい）
- 日付は `YYYY-MM-DD`（端末の時刻）、日時は ISO 文字列
- 週は月曜はじまり。`weekStart` はその週の月曜日 `YYYY-MM-DD`

### 3-2. 型

```ts
type StepId = string; // 小問・カード: 'ch02.torch-row'、手元課題の段階: 'p02.s1'
type ChapterId = string; // 'ch02'

type Progress = {
  stepId: StepId;
  chapterId: ChapterId;
  kind: 'card' | 'problem' | 'project-stage';
  status: 'new' | 'trying' | 'cleared';
  firstOpenedAt: string | null;
  clearedAt: string | null;
  clearedRev: number | null; // クリアしたときの教材の rev
  attemptCount: number;
  maxHint: 0 | 1 | 2 | 3;
  activeSeconds: number; // このステップを開いていた時間（9-8）
  points: number; // クリアで得た点（9-2）。クリア前は 0
  showcase: { code: Record<string, string>; output: string } | null; // 作品に飾る問題だけ。出力は 20KB まで
  localStartedAt: string | null; // 手元課題「VS Code で始める」を押した時刻
};

type AttemptResult =
  | 'pass'
  | 'fail'
  | 'compile-error'
  | 'runtime-error'
  | 'timeout'
  | 'output-limit'
  | 'crash'
  | 'wrong-answer'
  | 'internal-error';

type Attempt = {
  id: string;
  stepId: StepId;
  at: string;
  rev: number;
  result: AttemptResult;
  passed: number;
  total: number;
  where: 'browser' | 'local' | 'none'; // none = 予想・クイズ
  errorIds: string[]; // エラー図鑑の ID
  durationMs: number | null; // 実行にかかった時間
};

type Draft = { stepId: StepId; rev: number; files: Record<string, string>; updatedAt: string };

type Session = {
  id: string;
  kind: 'app' | 'local';
  startedAt: string;
  endedAt: string;
  activeSeconds: number;
  day: string; // 開始日
  weekStart: string;
  stepId: StepId | null; // local のときの手元課題の段階
};

type DexEntry = {
  errorId: string;
  discoveredAt: string;
  discoveredStepId: StepId;
  discoveredExcerpt: string; // エラーの行の前後3行（2KB まで）
  capturedAt: string | null;
  capturedStepId: StepId | null;
  capturedExcerpt: string | null;
};

type TechCard = {
  conceptId: string;
  rank: 'bronze' | 'silver' | 'gold';
  bronzeAt: string;
  silverAt: string | null;
  goldAt: string | null;
  lastCorrectAt: string;
};

type Review = { stepId: StepId; box: 1 | 2 | 3 | 4 | 5; due: string; lastAt: string }; // 後続
type RestWeek = { weekStart: string; createdAt: string };
type Chest = {
  id: string;
  openedAt: string;
  gapDays: number;
  grade: 'wood' | 'silver' | 'gold';
  items: string[];
};
type Note = { id: string; stepId: StepId | null; text: string; createdAt: string }; // 後続

type Legacy = {
  key: 'v1';
  source: 'indexeddb' | 'json';
  importedAt: string;
  valid: boolean; // v1 の Zod を通ったか
  data: V1BackupData | null; // 通ったとき
  raw: unknown | null; // 通らなかったときの読めた分（表示はしない。エクスポートには入れる）
  summary: { logCount: number; totalMinutes: number; memoCount: number; badgeCount: number };
};

// meta の行（key で区別）
type MetaApp = { key: 'app'; createdAt: string; lastActiveAt: string; lastContentVersion: string };
type MetaSettings = {
  key: 'settings';
  theme: 'light' | 'dark' | 'system';
  askStyle: 'hint' | 'explain' | 'answer';
  tileSize: 16 | 24 | 32;
};
type MetaMigration = {
  key: 'migration';
  status: 'done' | 'not-found' | 'failed';
  at: string;
  error: string | null;
};
type MetaOnboarding = {
  key: 'onboarding';
  installCardDismissedAt: string | null;
  setupDoneAt: string | null;
};
type MetaJava = {
  key: 'java';
  support: 'unknown' | 'ok' | 'unsupported';
  checkedAt: string;
  detail: string | null;
};
type MetaShortcut = { key: 'shortcut'; enabled: boolean; at: string }; // 近道ルート（後続）
```

- レベル・点の合計・技カードの数・完走見込みは保存しない。毎回 `progress` などから計算する（データが小さいため。二重管理を避ける）

### 3-3. v1 からの移行

#### 手順（起動時、`useAppBootstrap`）

1. v2 の DB を開く。`meta.migration` があれば何もしない
2. `Dexie.exists('java-study-tracker')` で v1 の DB があるか見る
   - 無ければ `migration = { status: 'not-found' }` を書いて終わり（`new Dexie(name).open()` は DB を作ってしまうので、先に確かめる）
3. v1 の DB を v1 と同じスキーマ（`version(1).stores({...})`）で開き、読み取りのトランザクションで全表を読む。すぐ閉じる。**書き込みはしない**
4. v1 の Zod（`v1Schema.ts`）で検査
5. `v1ToV2(v1Data, now)`（純粋関数）で `{ legacy, settingsPatch }` を作る
6. v2 の1つの書き込みトランザクションで、`legacy`・`meta.settings`（テーマ）・`meta.migration = done` を書く
7. 旧記録があればトーストを1回出す（「v1 の学習記録 ◯時間を『旧記録』に引き継ぎました」）

- 失敗したら `migration = { status: 'failed', error }` を書き、アプリは動かす。設定画面に「エクスポートした JSON から移せます」と出す
- テーマの写し（localStorage の `java-study-tracker:theme`）はキーを変えずに使い続ける

#### 変換表

| v1                                              | v2                                   | 画面                                     |
| ----------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `logs`（日付・分・内容・週）                    | `legacy.data.logs`（そのまま）       | 旧記録: 一覧と「これまで ◯時間」         |
| `weeks` の `memo`・`repoUrl`・状態・日付        | `legacy.data.weeks`（そのまま）      | 旧記録: 週ごとのメモ（Markdown）と URL   |
| `skills`                                        | `legacy.data.skills`                 | 旧記録: 週のチェック項目                 |
| `badges`                                        | `legacy.data.badges`                 | 旧記録: 旧バッジ（名前は `v1Badges.ts`） |
| `months`・`steps`                               | `legacy.data.months` `steps`         | 旧記録: 週の見出し                       |
| `settings.theme`                                | `meta.settings.theme`                | 設定                                     |
| `settings` のそのほか（目標・休止期間・開始日） | `legacy.data.settings`（使わない）   | 表示しない                               |
| 学習時間の合計                                  | 使わない（レベル・見込みに入れない） | 旧記録にだけ出す                         |

#### エクスポート・インポート

- 形: `{ app: 'java-study-tracker', schemaVersion: 2, exportedAt, contentVersion, data: { meta, progress, attempts, drafts, sessions, dex, cards, reviews, restWeeks, chests, notes, legacy } }`
- 読み込み
  - `schemaVersion: 2` → Zod で検査 → 件数を見せて確認 → 全表を消して書く（1トランザクション）
  - `schemaVersion: 1`（v1 のエクスポート）→ v1 の Zod → `v1ToV2` → `legacy` だけ上書き（今の進み具合は消さない）
  - 20MB を超えるファイル、`app` が違うものは読まない

---

## 4. Java 実行部分

### 4-1. 同梱するファイル

| 場所                                  | ファイル                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/java/teavm-javac/0.17.0-pg4/` | `compiler.wasm`（4.86MB）、`compiler.wasm-runtime.js`、`runtime-classlib-teavm.bin`（2.44MB）、`compile-classlib-teavm.bin`、`compiler.wasm-deobfuscator.wasm`、`SHA256SUMS`、`SOURCE.md` |
| `public/java/jq-shim/1/`              | `compile-classlib-teavm.jq.bin`（Scanner を足したもの。javac 用）、`shim-classes.bin`（TeaVM に渡す .class）、`SHA256SUMS`                                                                |

- ハッシュは research の付録の値と照合してから入れる。`SOURCE.md` に取得元 URL・取得日・teavm-javac のコミット・TeaVM 0.17.0・jdk25u のタグを書く
- 版はフォルダ名に入れる。更新したら新しいフォルダにし、Service Worker の古いキャッシュを消す（11章）

### 4-2. Worker の分け方

| Worker           | 寿命                                        | 役目                                                                                            | 時間切れ                                                    |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `compile.worker` | 常駐（1つ）。ホームの表示が終わってから起動 | ファイルの取得（進み具合つき）、`compiler.wasm` の読み込み、javac と TeaVM で `app.wasm` を作る | 15秒で応答がなければ作り直す                                |
| `run.worker`     | 実行ごとに新規。終わったら捨てる            | `app.wasm` を読み込んで `main` を呼ぶ。出力をまとめて送る                                       | 問題の `timeoutMs`（既定3000、1000〜10000）で `terminate()` |

- どちらも module Worker（`new Worker(new URL('./compile.worker.ts', import.meta.url), { type: 'module' })`）
- `compiler.wasm-runtime.js` は Vite で束ねず、`public/` の URL から動的 import（`import(/* @vite-ignore */ url)`）
- `.wasm` と `.bin` は `fetch` → `ArrayBuffer` で渡す（MIME に頼らない。research の推奨）
- コンパイルは毎回 `createCompiler()` で新しい Compiler を作る。classlib のバイト列は Worker の中で持ち回す
- コンパイラ内部の Wasm エラー（`RuntimeError` など）のときだけ、Worker を作り直して1回やり直す。学習者のコードのエラーではやり直さない
- 同じソースのコンパイル結果を、メインスレッドで8件まで覚える（キー: 全ファイルと teavm の版の SHA-256）。「実行」を続けて押したときに速い

### 4-3. メッセージの型

```ts
// メインスレッド → compile.worker
type CompileIn =
  | { type: 'init'; assets: AssetUrls; sizes: Record<string, number> }
  | { type: 'compile'; id: string; files: SourceFile[]; mainClass: 'JqRun' };

type AssetUrls = {
  compilerWasm: string;
  runtimeJs: string;
  runtimeClasslib: string;
  compileClasslib: string;
  shimClasses: string;
  deobfuscator: string;
};
type SourceFile = { path: string; content: string }; // path は 'Main.java' など

// compile.worker → メインスレッド
type CompileOut =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; initMs: number }
  | { type: 'init-failed'; message: string }
  | { type: 'compiled'; id: string; wasm: ArrayBuffer; ms: { javac: number; teavm: number } } // wasm は transfer
  | { type: 'compile-error'; id: string; diagnostics: RawDiagnostic[] }
  | { type: 'internal-error'; id: string; message: string };

type RawDiagnostic = {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string; // message は英語（teavm-javac）
};

// メインスレッド → run.worker
type RunIn = {
  type: 'run';
  id: string;
  wasm: ArrayBuffer;
  runtimeJs: string;
  deobfuscator: string;
};

// run.worker → メインスレッド（出力は 50ms ごとにまとめる）
type RunOut =
  | { type: 'stdout'; id: string; text: string }
  | { type: 'stderr'; id: string; text: string } // 判定の行（6-4）も含む。分けるのはメインスレッド
  | { type: 'exit'; id: string; code: number }
  | { type: 'limit'; id: string; reason: 'output' } // 上限を超えた。メインスレッドが terminate
  | {
      type: 'crash';
      id: string;
      kind: 'stack-overflow' | 'out-of-memory' | 'unknown';
      message: string;
    };
```

#### 画面が使う口（`JavaRunner`）

```ts
interface JavaRunner {
  readonly status: RunnerStatus; // 'idle' | 'downloading' | 'ready' | 'unsupported' | 'failed'
  subscribe(listener: (s: RunnerStatus, progress?: number) => void): () => void;
  prepare(): Promise<void>; // 先読み。何度呼んでもよい
  run(job: RunJob, onLive?: (chunk: LiveChunk) => void): Promise<RunResult>;
  cancel(): void; // 実行中のものを止める
}

type RunJob = {
  stepId: string;
  source: 'compact' | 'class';
  learnerFiles: SourceFile[]; // 編集できるファイル
  givenFiles: SourceFile[]; // 配る完成済みファイル
  testsJava: string | null; // Tests.java
  stages: JqStage[]; // 6-3 の JqCases の元
  timeoutMs: number;
};

type RunResult =
  | {
      kind: 'judged';
      stages: StageResult[];
      passed: number;
      total: number;
      displayOutput: string;
      stderr: string;
      ms: number;
    }
  | { kind: 'compile-error'; diagnostics: Diagnostic[] }
  | { kind: 'timeout'; partialOutput: string; doneStages: StageResult[] }
  | { kind: 'output-limit'; partialOutput: string }
  | { kind: 'crash'; error: RuntimeErrorInfo; partialOutput: string }
  | { kind: 'exited-early'; code: number; partialOutput: string } // 学習者が System.exit
  | { kind: 'unsupported' }
  | { kind: 'internal-error'; message: string };
```

- 実行中にもう一度「実行」が押されたら、前の `run.worker` を `terminate()` してから始める。コンパイル中のものは結果を捨てる（ID で見分ける）

### 4-4. 時間切れ・出力の上限

| 項目           | 値                                                                   | 動き                                                                                                                  |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 実行の時間切れ | 問題の `timeoutMs`（既定3000、1000〜10000）                          | メインスレッドのタイマーで `terminate()`。それまでの出力（最後の200行）を出す。図鑑の `infinite-loop`                 |
| コンパイル     | 15秒                                                                 | `compile.worker` を作り直し、「コンパイルが終わらなかった」。初回のダウンロードは別に数える                           |
| 出力の上限     | 標準出力と標準エラー（判定の行を除く）の合計 10万文字 または 2,000行 | `run.worker` が数え、超えたら送るのをやめて `limit` を送る → メインスレッドが `terminate()`。図鑑の `too-much-output` |
| 送る間隔       | 50ms                                                                 | 1文字ずつ送らない（画面が固まるため）                                                                                 |

### 4-5. 外枠（コンパクトソースを包む）

- 理由: コンパクトソースのクラスは、別のファイルから名前で参照できない（実測: javac が「シンボルを見つけられません」）。判定のクラスから学習者のメソッドを呼ぶために、通常のクラスに包む
- 方法（`src/domain/java/wrap.ts`。手元用に同じものを `Check.java` にも Java で持つ）
  1. 1行目の先頭に `import module java.base; ` を足す（コンパクトソースが暗黙に持つ import と同じ。teavm-javac・JDK 25 の両方で動くことを実測）
  2. 学習者の最後の `import` 文の `;` の直後（無ければ 1. で足した文の直後）に、改行せず ` final class Main {` を足す
  3. 末尾に改行と `}` を足す
- 行番号は変わらない。列は「`final class Main {` を足した行」だけずれるので、エラーの表示で引く
- 包んだクラスは teavm-javac と JDK の両方で動くことを実測（`new Main().twice(5)` と `new Main().main()`）
- `source: class`（第4章以降）は包まない。`public class Main` のファイル名は `Main.java`
- 同じ入力と期待する出力の組を `java/test-vectors/wrap.json` に置き、Vitest と Java（CI）の両方で確かめる

### 4-6. Scanner の代わり

- `java/shim/src/java.base/java/util/Scanner.java`・`InputMismatchException.java`（research で動いたものを元にする）
  - 対応: `next` `nextInt` `nextLong` `nextDouble` `nextBoolean` `nextLine` `hasNext` `hasNextInt` `hasNextLine` `close`。`new Scanner(System.in)` は渡されたストリームを無視し、`Scanner.setInput(String)` の内容を読む
- 作り方（`scripts/classlib-patch.ts`、JDK が必要）
  1. `javac --patch-module java.base=java/shim/src/java.base -d out` でコンパイル
  2. `compile-classlib-teavm.bin`（gzip。中は「名前の長さ2バイト・名前・データの長さ4バイト・データ」の並び）を展開し、.class を末尾に足して gzip し直す → `compile-classlib-teavm.jq.bin`
  3. 同じ .class を同じ並びの形で `shim-classes.bin` にする（compile.worker が `addClassFile()` で渡す）
- 再現の確認: CI で作り直し、**展開後のバイト列**が同梱のものと一致することを確かめる（gzip のヘッダーや圧縮の実装の違いで圧縮後は一致しないことがあるため）。JDK の版は `java/JDK_VERSION` に固定
- 入力の渡し方は `StdinBridge`（6-2）で、ブラウザと JDK の違いを1ファイルに閉じ込める（TeaVM には `System.setIn` が無い。実測）

### 4-7. エラーの整形

| 起きたこと                           | 画面の表示                                                                                                     | 図鑑              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| コンパイルエラー（学習者のファイル） | 「3行目 5文字目: `';' expected`」＋図鑑の日本語の説明。エディタの行に印。5件まで（最初の1件を強調）            | 文言で判定（4-8） |
| コンパイルエラー（判定用のファイル） | 「判定用のコードでエラー。教材の不具合かもしれません」＋[問題を報告]                                           | なし              |
| 実行時の例外（ケースの中）           | 「ArithmeticException（0 で割った）12行目」。メッセージが null のときは出さない。`org.teavm.` で始まる行は消す | 例外の型で判定    |
| JS の `RangeError`                   | 「StackOverflowError（再帰が深すぎる）」                                                                       | `stack-overflow`  |
| メモリ不足の Wasm エラー             | 「メモリが足りない（配列が大きすぎるかも）」                                                                   | なし              |
| 時間切れ                             | 「3秒たっても終わらなかった（無限ループかも）」＋途中までの出力                                                | `infinite-loop`   |
| 出力の上限                           | 「出力が多すぎる（無限ループかも）」＋途中までの出力                                                           | `too-much-output` |
| 学習者の `System.exit`               | 「途中で終了した（System.exit）」                                                                              | なし              |
| コンパイラ内部のエラー               | 1回やり直す。だめなら「Java の実行環境でエラー。もう一度押すか、手元で実行」                                   | なし              |

- 英語の原文はそのまま出す（チャットで質問するときに使える）。説明が無いエラーは「質問文を作ると、チャットで日本語にできます」

### 4-8. エラー図鑑の判定

- `content/errors.yaml` の各項目に、判定の条件を持たせる

```yaml
- id: semicolon-expected
  name: ;忘れ
  kind: compile # compile | runtime | limit
  match:
    javacEn: ["^';' expected$"] # teavm-javac・英語の JDK
    javacJa: ["^';'がありません$"] # 日本語の JDK（手元）
  summary: 文の終わりの ; が無い
  causes: [行の終わりに ; を書き忘れた, 前の行の ) が足りない]
  fix: エラーの行か、その1つ前の行の終わりを見る
  chapter: 0
  fixture: true # content/errors-fixtures/semicolon-expected.java で確かめる
- id: arithmetic
  name: ゼロ割り
  kind: runtime
  match: { exception: [java.lang.ArithmeticException] }
```

- 判定: コンパイルエラーは各メッセージの1行目に、`javacEn` と `javacJa` の正規表現を順に当てる。実行時は例外の完全な型名。時間切れ・出力の上限は固定の ID
- 発見・捕獲のルールは 9-4
- MVP の12種（英語・日本語の文言は JDK 25.0.5 で実測）

| ID                 | 名前（仮）        | 判定                                                                                         |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| semicolon-expected | ;忘れ             | `';' expected` / `';'がありません`                                                           |
| cannot-find-symbol | 名前ちがい        | `cannot find symbol` / `シンボルを見つけられません`                                          |
| incompatible-types | 型ちがい          | `^incompatible types` / `^不適合な型`                                                        |
| uninitialized      | からっぽ変数      | `variable .+ might not have been initialized` / `変数.+は初期化されていない可能性があります` |
| unclosed-string    | 閉じない文字列    | `unclosed string literal` / `文字列リテラルが閉じられていません`                             |
| reached-eof        | 足りない }        | `reached end of file while parsing` / `構文解析中にファイルの終わりに移りました`             |
| paren-expected     | 足りない )        | `^'\)'( or ',')? expected` / `^'\)'(または',')?がありません`                                 |
| else-without-if    | ひとりぼっち else | `'else' without 'if'` / `'else'への'if'がありません`                                         |
| already-defined    | 二重の名前        | `variable .+ is already defined` / `変数 .+はすでに.+で定義されています`                     |
| arithmetic         | ゼロ割り          | `java.lang.ArithmeticException`                                                              |
| number-format      | 数字じゃない      | `java.lang.NumberFormatException`、`java.util.InputMismatchException`                        |
| infinite-loop      | 終わらないループ  | 時間切れ                                                                                     |

- 第3章以降で足す: `array-index`（`ArrayIndexOutOfBoundsException`）、`string-index`、`missing-return`（`missing return statement` / `return文が指定されていません`。実測）、`null-pointer`、`class-cast`、`stack-overflow`、`too-much-output`、`illegal-start`（`illegal start of expression` / `式の開始が不正です`。実測）
- teavm-javac の英語の文言が JDK と同じかは、`errors-fixtures` で CI が確かめる（同じ javac のはずだが未確認）

### 4-9. 対応ブラウザの判定

1. 起動時: `WebAssembly.validate()` に、GC の struct 型を1つだけ持つ最小のモジュールを渡す（バイト列はフェーズ2で各ブラウザで確かめて決める）
2. 最初の準備のとき: `Hello` を実際にコンパイル・実行し、`hello` が出るか確かめる
3. どちらかが失敗 → `meta.java.support = 'unsupported'`。ステップ画面に案内（02-requirements.md N-BR-2）。設定の「もう一度確かめる」でやり直せる

### 4-10. 先読み

- ホームの表示が終わり、`requestIdleCallback`（無ければ 1.5秒後）で `JavaRunner.prepare()`
- 非対応と分かっていれば読まない
- 読み込みの進み具合: 各ファイルの大きさは `public/java/manifest.json`（content-build が作る）から取る（gzip で配られると `Content-Length` が当てにならないため）

---

## 5. 判定（ハーネス）

### 5-1. 方針

- 判定は Java の側で行う。ブラウザ・手元・CI で**同じ Java のクラス**を使い、結果を決まった形の行（5-4）で出す
- TypeScript は、その行を読むだけ（比べ方を3か所に書かない）
- 例外: 予想問題の入力の比較（NFKC など）は TypeScript（Java のコードを動かさないため）

### 5-2. クラス

| ファイル                                | 役目                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `java/harness/JqRun.java`               | 入口。`JqCases` の段階とケースを順に動かし、`Tests` を呼び、最後に `done` を出して `System.exit(0)`             |
| `java/harness/JqTests.java`             | テストの基底クラス。`check`・`checkNear`・`checkOutput`・`checkThrows`                                          |
| `java/harness/JqCapture.java`           | `System.out`・`System.err` を横取りして、バッファと本当の出力の両方に書く（途中で止まっても出力が見えるように） |
| `java/harness/JqProtocol.java`          | 判定の行を、本当の標準エラーに `\u001E@@jq ` ＋ JSON 1行で書く。JSON のエスケープもここ                         |
| `java/harness/JqText.java`              | 出力の正規化と比較、値の表示（文字列は `"..."`、配列は `Arrays.toString`、`null`）                              |
| `java/harness-browser/StdinBridge.java` | `java.util.Scanner.setInput(input)`（代わりの Scanner）                                                         |
| `java/harness-jdk/StdinBridge.java`     | `System.setIn(new ByteArrayInputStream(input.getBytes(UTF_8)))`                                                 |
| 生成: `JqCases.java`                    | 段階・ケースの名前・入力・期待する出力を Java の文字列で持つ（TS か `Check.java` が作る）                       |
| 生成: `JqEntry.java`                    | 学習者の `main` の呼び方。`compact` → `new Main().main();`、`class` → `Main.main(new String[0]);`               |
| 教材: `Tests.java`                      | `final class Tests extends JqTests { void run(int stage) { ... } }`                                             |

- ハーネスは学習者向けの「使ってよい文法」の検査の対象外（ラムダなども使う）
- ハーネスの Java は、ブラウザで動かす問題と同じ禁止リストを守る（`getMessage` を表示しない など）

### 5-3. 判定の2つの形

#### 出力の比較（`judge.mode: output`）

- ケースごとに入力（`stdin`）を渡し、`JqEntry.run()` の標準出力を期待する出力と比べる
- 正規化（`JqText.normalize`）: `\r\n` を `\n` に、各行の末尾の空白を消す、末尾の空行を消す。それ以外（全角・半角、行頭の空白）は区別する
- 失敗したら `expected` と `actual` を送り、画面で行ごとの差分を出す

#### テスト関数（`judge.mode: tests`）

```java
final class Tests extends JqTests {
    @Override
    void run(int stage) {
        Main m = new Main();
        char[][] map = JqData.map("#####", "#@.>#", "#####");
        check("canMove: 壁には入れない", () -> m.canMove(map, 0, 0), false);
        check("canMove: 床には入れる", () -> m.canMove(map, 2, 1), true);
        checkNear("平均", () -> m.average(new int[] {1, 2}), 1.5, 1e-9);
        checkOutput("drawRow(3)", "", () -> m.drawRow(3), "###");
        checkThrows("0 で割ると例外", ArithmeticException.class, () -> m.divide(1, 0));
    }
}
```

- `check(name, Supplier<?> actual, Object expected)`: `Objects.equals` で比べる。値を作る途中の例外も1件の失敗として捕まえる
- `both` = 出力の比較とテスト関数の両方
- 松明1本 = 期待する出力を持つケース1件、または `check` 1件

#### 「そのまま実行」のケース

- 先頭に必ず「そのまま実行」のケース（段階0）を置く。学習者の `main` を問題の既定の `stdin` で動かす
- この出力を「出力」欄とタイルに出す。`mode: tests` では期待する出力を持たない（松明にならない）

### 5-4. 判定の行（プロトコル）

- 標準エラーに、1行ずつ `\u001E@@jq ` ＋ JSON。`\u001E`（レコード区切り）は学習者がまず出さない文字
- 手元で貼られた出力ではこの文字が消えることがあるので、読む側は `@@jq ` だけでも受け付ける

```text
@@jq {"t":"hello","v":1,"source":"compact"}
@@jq {"t":"case","stage":0,"i":0,"name":"そのまま実行","ok":null,"actual":"#####\n#@..#\n"}
@@jq {"t":"case","stage":1,"i":1,"name":"高さ4","ok":false,"expected":"...","actual":"...","error":null}
@@jq {"t":"check","stage":1,"name":"canMove: 壁には入れない","ok":true}
@@jq {"t":"check","stage":1,"name":"平均","ok":false,"expected":"1.5","actual":"1.0"}
@@jq {"t":"case","stage":1,"i":2,"name":"高さ0","ok":false,"error":{"type":"java.lang.ArithmeticException","line":7}}
@@jq {"t":"stage","stage":1,"passed":3,"total":5}
@@jq {"t":"done","passed":3,"total":5}
```

- `error.line` は、スタックトレースのうち学習者のファイルの最初の行。分からなければ `null`（teavm-javac で取れるかは deobfuscator 次第。未確認）
- `done` が来ないまま終わったら: 終了コード ≠ 0 なら `crash`、0 なら `exited-early`
- 読む側（`src/domain/java/protocol.ts`）は、知らない `t` を無視する（後で増やせるように）

### 5-5. 使う場所ごとの組み立て

| 場所                     | 作るファイル                                                                                           | 動かし方                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| ブラウザ                 | 包んだ `Main.java`、配るファイル、`Tests.java`、ハーネス（browser 版）、`JqCases.java`、`JqEntry.java` | compile.worker → run.worker（`mainClass: 'JqRun'`）                                                       |
| CI（content-verify）     | 同じ。JDK 側はハーネスの jdk 版                                                                        | JDK: `javac -d` → `java -cp`。teavm: Node の別プロセス（問題ごと）                                        |
| 手元の小問（F-STEP-10）  | 1ファイル `JqCheck.java`（5-6）                                                                        | `java JqCheck.java`                                                                                       |
| 手元課題（`Check.java`） | 一時フォルダに、学習者のファイル（包む）・ハーネス（jdk 版）・`JqCases`・`Tests` を書く                | `Check.java` が同じ `java` を子プロセスで起動（`ProcessHandle.current().info().command()`）。20秒で止める |

### 5-6. 手元で実行する1ファイル（`JqCheck.java`）

- 1ファイルにまとめる理由: コピーして貼るだけで動かせる（ブラウザで動かないときの唯一の代わり。01-decisions.md）
- 中身の順番
  1. `import module java.base;`（`compact` のとき）と、学習者の `import` をまとめたもの
  2. `class JqCheck { public static void main(String[] a) { JqRun.main(a); } }`（JDK の「ソースファイルのまま実行」は、ファイルの最初のクラスを動かす）
  3. 学習者のコード（`compact` は `final class Main { ... }` に包む）
  4. 配るファイル、`Tests`、ハーネス、`JqCases`、`JqEntry`（すべて `public` を外す）
- 学習者のコードは「◯行目から」と先頭のコメントに書き、貼られた出力を読むときに行番号を引く
- `public class Main` が `JqCheck.java` の中にあっても、ソースファイルのまま実行するときは JDK がファイル名を問わない（JEP 330）。`compact` の形は実測で動いた。`class` の形はフェーズ1で確かめる
- 出力を貼ると、5-4 の行を読んで判定結果として記録する（`where: 'local'`）

---

## 6. 教材の形式とスクリプト

### 6-1. フォルダ

```
content/ch02/torch-row/
  problem.md          # 前書き（YAML）＋本文
  Starter.java        # ひな形（学習者が最初に見る。画面では Main.java）
  Solution.java       # 模範解答（ビルドに入れない）
  Tests.java          # テスト関数（judge.mode が tests・both のとき）
  expected/1.txt      # ケース1の期待する出力（JDK の出力から作る。手で書かない）
  wrong/OffByOne.java # よくある間違い（2つ以上。修理問題は1つ以上）
  given/Pos.java      # 配る完成済みファイル（読み取り専用のタブで見せる。任意）
```

| 種類（`type`）                  | 必要なファイル                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `card`                          | `problem.md`、任意で `Example.java`（`expected/0.txt` を作る）                                                              |
| `predict`                       | `problem.md`、`Program.java`（読むだけのコード）、`expected/0.txt`                                                          |
| `quiz`                          | `problem.md` だけ                                                                                                           |
| `fill` `fix` `implement` `draw` | `problem.md`、`Starter.java`、`Solution.java`、`wrong/*.java`、出力の比較なら `expected/*.txt`、テスト関数なら `Tests.java` |
| `parsons`（後続）               | `problem.md`、`Solution.java`（行の並びの元）、`distractors.txt`（ダミーの行）                                              |

- 問題のフォルダ名（slug）は英小文字・数字・`-`。ID は `ch<2桁>.<slug>`。並び順は前書きの `order`（10刻み）

### 6-2. `problem.md` の前書き（完全なスキーマ）

```yaml
id: ch02.torch-row # 必須。/^ch\d{2}\.[a-z0-9-]+$/。フォルダと一致。一度決めたら変えない
rev: 1 # 必須。1以上の整数。中身を大きく変えたら上げる（クリアの記録は残る）
type: draw # 必須。card | predict | quiz | fill | fix | implement | draw | parsons
title: 松明を並べる # 必須。20文字まで
chapter: 2 # 必須。0〜9。フォルダの章と一致
order: 50 # 必須。章の中の並び。重複不可
concepts: [for, modulo] # 必須（card・quiz は任意）。concepts.yaml の ID
minutes: 3 # 必須。1〜5（作り手の見積もり）。手元課題は project.md 側
optional: false # 任意。既定 false。true = おかわり（近道ルートで後回し）
easy: false # 任意。既定 false。おかえりの解き直しに使える易しい問題
showcase: false # 任意。既定 false。クリア時の出力を作品に飾る
source: compact # Java を含む種類で必須。compact | class
runtime: browser # 任意。既定 browser。local = ブラウザでは動かさない（手元で実行のみ）
render: tiles # 任意。既定 text。tiles = 出力をタイルで描く
tiles: { S: slime, C: chaser } # 任意（後続 F-TILE-2）。英大文字 → 魔物のタイル名
timeoutMs: 3000 # 任意。既定 3000。1000〜10000
stdin: '' # 任意。「そのまま実行」に渡す入力
judge: # fill | fix | implement | draw で必須
  mode: output # output | tests | both
  cases: # output・both で1件以上
    - name: 高さ4 # 必須。ケースの名前（画面に出る）
      stdin: "4\n" # 任意
expectError: # fix で必須。ひな形のままだと何が起きるか
  kind: compile # compile | exception | test
  dex: semicolon-expected # compile・exception のとき必須。errors.yaml の ID
inputMode: text # predict で必須。text | choice
choices: # predict の choice・quiz で必須。2〜4個
  - "3\n"
  - "4\n"
answer: 1 # quiz で必須（0始まり）。predict は expected/0.txt と一致する選択肢が正解（検証で1つだけを確かめる）
allowExtra: # 任意。使ってよい文法の例外
  - api: 'String#repeat'
    reason: 絵を描くため第0章で先取り
reviewed: false # 必須。true のものだけ公開
```

- Zod のスキーマ（`src/content/schema.ts`）が正本。上の「必須」「範囲」「種類ごとの必須」を `superRefine` で検査する
- 種類と項目の組み合わせが違う（例: `predict` に `judge`）ときもエラー

### 6-3. `problem.md` の本文

- 見出しの名前で切り分ける。決まった見出し以外はエラー

| 見出し       | card | predict | quiz | fill・fix・implement・draw                     |
| ------------ | ---- | ------- | ---- | ---------------------------------------------- |
| `## 説明`    | 必須 | —       | —    | —                                              |
| `## 問題`    | —    | 必須    | 必須 | 必須                                           |
| `## ヒント1` | —    | 任意    | 任意 | 必須                                           |
| `## ヒント2` | —    | —       | —    | 必須                                           |
| `## ヒント3` | —    | —       | —    | 必須（答えそのものにしない）                   |
| `## 解説`    | —    | 必須    | 必須 | 必須（2〜5行。模範解答のコード全体は書かない） |

- 本文の Markdown は画面で react-markdown（生の HTML なし）で描く

### 6-4. Starter・Solution・wrong・expected の扱い

| ファイル         | 画面に出すか                                     | ビルドの出力に入れるか | 検証                                                         |
| ---------------- | ------------------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| `Starter.java`   | 出す（エディタの初期値、ファイル名 `Main.java`） | 入れる                 | 少なくとも1つの松明が消える（修理は `expectError` のとおり） |
| `Solution.java`  | **出さない**                                     | **入れない**           | 全部の松明がともる（JDK・teavm の両方）                      |
| `wrong/*.java`   | 出さない                                         | 入れない               | 全部が少なくとも1つ失敗する（両方）                          |
| `expected/*.txt` | 目標の絵・差分として出す                         | 入れる                 | JDK の出力と一致。`--update` で作り直す                      |
| `Tests.java`     | 出さない（失敗したテストの名前と値は出す）       | 入れる                 | ハーネスと一緒にコンパイルできる                             |
| `given/*.java`   | 読み取り専用のタブで出す                         | 入れる                 | 使ってよい文法の検査の対象外                                 |

- 模範解答はリポジトリには入る（公開リポジトリ）。うっかり見ないための決まり: 教材のプルリクエストの説明やエージェントの返答に中身を書かない（「第2章 12問追加、CI 全通過」程度）

### 6-5. `course.yaml`・`concepts.yaml`・`decorations.yaml`

```yaml
# content/course.yaml
version: 2026.12.01-1 # 教材の版。公開のたびに上げる
chapters:
  - id: ch00
    number: 0
    title: はじめの一歩
    dungeon: { version: v0.0, adds: 入口の看板と最初の部屋 }
    plannedMinutes: 72 # 未公開でも完走見込みに使う
    askStage: void main と println まで。変数・if・for・配列・クラスはまだ
    allow:
      keywords: [void]
      apis: [System.out.println, System.out.print]
    project: p00
  # ... ch01〜ch09
```

```yaml
# content/concepts.yaml（技カード）
- id: for
  name: for 文
  chapter: 2
  oneLine: 決まった回数くりかえす
```

```yaml
# content/decorations.yaml（宝箱の飾り。見た目だけ）
- id: banner-red
  name: 赤い旗
  tile: banner # 作品画面の飾りの絵の名前
```

### 6-6. 手元課題の形式

```
content/projects/p03/
  project.md            # 前書き＋段階ごとの本文
  starter/Maze.java     # 作業フォルダに入るひな形
  solution/Maze.java    # 模範解答（zip にもビルドにも入れない）
  given/                # 配る完成済みファイル（任意）
  Tests.java            # 段階ごとのテスト（run(int stage) の中で分ける）
  expected/s1-1.txt     # 段階1・ケース1の期待する出力（JDK から作る）
  wrong/s2/*.java       # 段階2で落ちるべき間違い（任意）
```

```yaml
# project.md の前書き
id: p03 # /^p\d{2}$/
rev: 1
chapter: 3
title: 迷路を歩く
source: compact # compact | class | spring
mainFile: Maze.java
learnerFiles: [Maze.java]
stages:
  - n: 1
    title: マップを読み込んで描く
    minutes: 20
    mode: output # output | tests | both
    cases:
      - { name: 小さなマップ, stdin: '' }
  - n: 2
    title: 移動の文字列で歩く
    minutes: 20
    mode: both
    cases:
      - { name: 壁にぶつかる, stdin: "RRRR\n" }
reviewed: false
```

- 本文の見出し: `## 段階1`、`## 段階1 ヒント1`〜`3`、… 、`## まとめ`
- `p00`（手元の準備）は段階1つ。`Hello.java` を動かすだけ
- `p09`（Spring Boot）は `source: spring`。`Check.java` は使わず、Maven Wrapper の `./mvnw test` の結果を見て段階ごとのクリアコードを出す小さなテストクラスを配る（形はフェーズ7で決める）

### 6-7. `Check.java` とクリアコード

#### `Check.java`（workspace-build が章ごとに作る）

- 置き場所: `java-quest/chNN/Check.java`。ハーネスは `java-quest/chNN/.jq/` に入れる
- 動き
  1. 自分の版（教材の版・課題の rev）を表示
  2. 一時フォルダに学習者のファイル（`compact` は 4-5 の方法で包む。Java で同じ処理）、`.jq/` のハーネス（jdk 版）、`JqCases.java`（`Check.java` の中の文字列から書き出す）、`Tests.java` を書く
  3. `java JqRun.java` を子プロセスで起動（20秒で止める）。標準エラーの `@@jq` の行を読む
  4. 人が読める結果と、クリアコードを表示
  5. 失敗があれば、章フォルダに `.jq-ask.md`（10章の形の質問文の下書き）を書く
- 出力の形（アプリが貼られたものを読むので固定）

```text
JQ-CHECK 1 p03 rev1 content 2026.12.01-1
[1/3] マップを読み込んで描く ........ PASS
[2/3] 移動の文字列で歩く ............ FAIL
      ケース「壁にぶつかる」
      期待: #@..#
      実際: #..@#
[3/3] ゴール判定と歩数 .............. FAIL
クリアコード: JQ1-p03-1/3-K7QF
質問文の下書き: .jq-ask.md
```

- `passed` は「段階1から続けて通った数」（上の例では1）。0 のときは `クリアコード: なし`

#### クリアコードの計算

- 形: `JQ1-<課題ID>-<passed>/<total>-<確認用4文字>`（例: `JQ1-p03-1/3-K7QF`）
- 確認用4文字
  1. 文字列 `s = "<課題ID>|<passed>|<total>|<rev>"`（ASCII だけ）
  2. FNV-1a 32bit: `h = 0x811c9dc5`。各バイト `b` で `h ^= b; h = h * 0x01000193`（32bit で切る。TS は `Math.imul(h, 0x01000193) >>> 0`、Java は `int` のかけ算）
  3. 符号なしにして `36^4`（1,679,616）で割った余り
  4. 36進数の大文字、4桁にそろえる（左を `0` で埋める）
- アプリでの照合: 今の `rev` で合わなければ `rev - 1` でも試す。合えば記録し「作業フォルダが古いかもしれません（新しい zip があります）」と出す
- 目的は打ち間違いの防止だけ（不正は防がない。利用者は本人1人。critic-tech 5-2）
- テストデータ `java/test-vectors/clear-code.json`（入力と期待するコードの組）を Vitest と Java の両方で確かめる

#### 作業フォルダ（`public/java-quest/`）

```
java-quest/
  README.md                 # 開き方、Cmd+Shift+B、よくあるつまずき
  VERSION                   # 教材の版と各課題の rev
  .vscode/tasks.json        # 「判定する」= java Check.java（cwd: 開いているファイルのフォルダ）。既定のビルドタスク
  .vscode/settings.json
  ch00/ Hello.java Check.java .jq/
  ch01/ Status.java Check.java .jq/
  ...
  ch09/ dungeon-web/        # Spring Boot（pom.xml、mvnw、src/）
```

- zip は2種類: 全章 `java-quest.zip`、章ごと `java-quest-chNN.zip`（展開先に同じフォルダがあれば、名前を変えてから展開するよう案内）
- zip は `fflate` で作る。ファイルの時刻を固定し、同じ入力から同じ zip になるようにする

### 6-8. content-build（`npm run content:build`）

- JDK 不要。`npm run build`・`dev`・`typecheck`・`test` の前に自動で動く（npm の `pre*`。2秒以内を目標）
- 入力: `content/`。出力: `src/content/generated/`（git に入れない）、`public/java/manifest.json`
- 手順
  1. `course.yaml`・`concepts.yaml`・`errors.yaml`・`decorations.yaml` を読み、Zod で検査
  2. 各問題・各手元課題のフォルダを読み、前書き（`yaml` で解析）と本文（見出しで分割）を Zod で検査
  3. 参照の検査: ID の重複、章とフォルダの一致、`order` の重複、`concepts`・`dex` の参照先、種類ごとの必要なファイル
  4. `reviewed: false` のものを外す（`--all` を付けると含める。開発用）
  5. 出力
     - `course.json`: 章・ステップの並び（ID・題・種類・目安・おかわり）・技カード・エラー図鑑・飾り・教材の版
     - `chNN.json`: その章のステップの中身（本文、Starter、given、Tests、ケースと期待する出力、`Program.java`、選択肢）。**Solution と wrong は入れない**
     - `projects.json`: 手元課題の段階・本文・ケース
  6. 画面は `course.json` を最初に読み、`chNN.json` は開くときに動的 import（Vite がハッシュ付きの別ファイルにする）
- エラーはファイルの場所と項目名を全部まとめて出し、終了コード 1

### 6-9. content-verify（`npm run content:verify`）

- JDK 25 と Node が必要。CI では専用のジョブ（11章）
- 使い方: `npm run content:verify -- [--only ch02 | --only ch02.torch-row] [--update] [--jobs 4] [--no-teavm] [--no-cache]`
- 実行の仕組み
  - JDK: 一時フォルダに 5-5 のファイルを書き、`javac -encoding UTF-8 -d out` → `java -cp out JqRun`。日本語の文言の確認は `-J-Duser.language=ja -J-Duser.country=JP`
  - teavm-javac: Node の別プロセス（`scripts/lib/teavm-run.ts`）で1問ずつ。理由: Node で同じ compiler.wasm を何度も使うと落ちることがある（research）
  - 並列: 既定は CPU 数 − 1（最大4）
  - キャッシュ: 問題フォルダの全ファイル・ハーネス・teavm の版・JDK の版・検証スクリプトの版の SHA-256 をキーに、通った結果を `.cache/content-verify/` に置く。CI では `actions/cache` で持ち越す
  - 1回の実行の上限: JDK・teavm とも10秒
- 確かめること

| 対象            | 確かめること                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| すべて          | content-build と同じスキーマ・参照の検査                                                                                             |
| Java を含むもの | 使ってよい文法（6-10）、ブラウザで使わない書き方（`runtime: browser` のとき。02-requirements.md 8-3）                                |
| Solution        | JDK と teavm の両方で、全部の松明がともる。ケースごとの出力が JDK と teavm で完全に一致                                              |
| Solution        | JDK で2回動かして出力が同じ（毎回同じ結果）                                                                                          |
| expected/*.txt  | JDK の出力と一致（`--update` で書き直す。teavm と違うときは書き直さずに落とす）                                                      |
| 出力            | `Hero@1b6d3586` のような既定の `toString` に見える文字列（`/\b[A-Z]\w*@[0-9a-f]{5,}\b/`）を含まない                                  |
| Starter         | 少なくとも1つ失敗（両方）                                                                                                            |
| fix の Starter  | `expectError` のとおり: compile なら javac（英・日）と teavm の両方で `dex` の判定に当たる。exception なら例外の型が両方で一致       |
| wrong/*.java    | それぞれ少なくとも1つ失敗（両方）                                                                                                    |
| predict         | `Program.java` を両方で動かして一致。`expected/0.txt` と一致。`choice` なら正解がちょうど1つで、ほかは違う                           |
| card の Example | 両方で動き、一致                                                                                                                     |
| draw            | 期待する出力が 80桁×40行に収まる                                                                                                     |
| quiz            | `answer` が選択肢の範囲内（中身の正しさはレビュー担当が見る）                                                                        |
| errors.yaml     | `fixture: true` の項目は、`errors-fixtures/<id>.java` が javac（英・日）・teavm で判定に当たる。runtime は例外の型が両方で一致       |
| 手元課題        | 作業フォルダを組み立て、`solution/` を入れて `java Check.java` → 全段階 PASS と正しいクリアコード。`starter/` のままでは段階1が FAIL |
| ハーネス        | `test-vectors/wrap.json`・`clear-code.json` を Java で確かめる                                                                       |
| classlib        | `classlib-patch.ts --check`: 作り直した展開後のバイト列が同梱のものと一致                                                            |

- 出力: 問題ごとに `OK` / `NG（理由）`、最後に合計。NG が1つでもあれば終了コード 1
- `tests/content-fixtures/` にわざと壊した教材を置き、content-verify が正しく落とすことを Vitest（JDK がある環境だけ）で確かめる

### 6-10. 「使ってよい文法」の検査（簡易）

- 対象: Starter・Solution・Program・Example・手元課題の starter/solution
- 方法（`scripts/lib/allowlist.ts`）
  1. コメントと文字列リテラルを消す
  2. 取り出すもの: Java のキーワード、`Type.method(`（static）、`.method(`（インスタンス）、`new Type`、型として使われた大文字始まりの名前、`->`（`case` の後ろ以外はラムダ）、`::`、配列の `[`、型引数の `<`
  3. 許すもの: 第0〜N章の `allow` の合計、`allowExtra`、そのファイルと given で宣言された名前（クラス・メソッド・フィールド）
  4. インスタンスのメソッドは名前だけで照合する（どの型のものかは見ない。簡易のため）
- 誤判定があれば `allowExtra` で理由を書いて通す。検査の精度を上げるより、レビューで補う

### 6-11. 公開までの流れ（教材）

1. 作成エージェントがフォルダを作る（`reviewed: false`）
2. `npm run content:verify -- --only <id> --update` で期待する出力を作る → 差分を見る
3. 別のレビュー用エージェントがチェックリストで確かめる: 問題文だけで解けるか／ヒント3が答えそのものでないか／解説が出力と矛盾しないか／まだ習っていない用語がないか／1〜3分で終わる大きさか
4. `reviewed: true` にしてコミット。CI の content ジョブが通れば公開される

---

## 7. （欠番）

- 番号は 02-requirements.md の参照（8章＝タイル、9章＝ルール）に合わせるため空けている

---

## 8. タイル描画

### 8-1. 決まり

- `render: tiles` の問題では、「そのまま実行」の標準出力を文字の格子として描く
- 1文字＝1マス。全角の文字（East Asian Width が F・W）は2マス。タブは空白4つ
- 行の長さが違うときは、一番長い行に合わせて右を「闇」で埋める
- 上限 80桁×40行。超えたら「文字」の表示に切り替え、「大きすぎてタイルにできない」と出す
- 描き方: CSS グリッド（`<div role="img">`）。1マス 24px（設定で 16／24／32）。キャンバスは使わない（テストしやすさと、文字の選択のため）
- タイルの面は常に暗い背景（テーマに関係なく。地下の雰囲気とコントラストのため）
- 「タイル／文字」の切り替え。文字の表示は等幅の `<pre>`（読み上げとコピーに使う）
- 絵の問題では、目標（`expected/1.txt` または `expected/0.txt`）を薄く（不透明度 35%）並べて出す（影）

### 8-2. 文字とタイルの対応

| 文字        | タイル（名前）         | 色（地 / 図）         | 形                         |
| ----------- | ---------------------- | --------------------- | -------------------------- |
| ` `（空白） | 闇 `void`              | `#0b0d12`             | なし                       |
| `.`         | 床 `floor`             | `#232833` / `#3b4252` | 中央に小さな点             |
| `#`         | 壁 `wall`              | `#5c6370` / `#3e434d` | 石積み（線2本）            |
| `+`         | 扉 `door`              | `#232833` / `#a0703c` | 板の扉                     |
| `@`         | 勇者 `hero`            | `#232833` / `#ffd54a` | 丸と目                     |
| `>`         | 下り階段 `stairs-down` | `#232833` / `#3fb950` | 段3本                      |
| `<`         | 上り階段 `stairs-up`   | `#232833` / `#58a6ff` | 段3本（逆向き）            |
| `*`         | 松明 `torch`           | `#232833` / `#ff9e3d` | 炎（光の輪）               |
| `$`         | 金貨 `gold`            | `#232833` / `#f2cc60` | 円                         |
| `!`         | 薬 `potion`            | `#232833` / `#ff6b9a` | 瓶                         |
| `&`         | 宝箱 `chest`           | `#232833` / `#c08a3e` | 箱                         |
| `~`         | 水 `water`             | `#1d3b66` / `#4f8fd6` | 波線                       |
| `^`         | 罠 `trap`              | `#232833` / `#d1495b` | とげ                       |
| `%`         | 草 `grass`             | `#1f3a24` / `#3fa34d` | 草                         |
| `\|`        | 柱 `pillar`            | `#232833` / `#9aa0a6` | 縦の柱                     |
| `=`         | バー（満） `bar-full`  | `#2ea043`             | 塗りつぶし                 |
| `-`         | バー（空） `bar-empty` | `#30363d`             | 塗りつぶし                 |
| `[` `]`     | バーの端 `bar-cap`     | `#0b0d12` / `#c9d1d9` | 括弧の線                   |
| `0`〜`9`    | 数字 `digit`           | `#161b22` / `#e6edf3` | 文字そのもの（等幅、太字） |
| そのほか    | 文字 `glyph`           | `#161b22` / `#c9d1d9` | 文字そのもの（等幅）       |

- 英大文字は既定では「文字」。問題の `tiles` で魔物（`slime` `bat` `skeleton` `chaser` `ghost` `dragon` `npc`）に割り当てられる（後続 F-TILE-2）
- 形は SVG のスプライト1枚（`src/components/tiles/sprites.svg`）を `<use>` で描く。絵は単純な図形だけ（critic-tech: イラスト中心にしない）
- 色は `src/domain/tiles/tileTable.ts` にまとめる。図と地のコントラストは 3:1 以上（WCAG の非テキストの基準）を Vitest で確かめる
- アクセシビリティ: 格子全体に `aria-label`（例:「タイル 12×5。勇者1、松明3、壁20」）。各マスは読み上げない。文字の表示に切り替えられる
- 色・アニメーション（コマ送り）は後続。行の頭が `@@jq ` の行（判定の行と同じ印）で指示する形を予定（F-TILE-3）

---

## 9. ルール（計算式）

### 9-1. 次のステップの選び方（`domain/progress/nextStep.ts`）

- 入力: コースの並び（公開済みのステップ）、`progress`、今日、宝箱の状態、近道ルートか
- 決め方（上から順に、最初に当てはまったもの）
  1. 宝箱がまだ開いていない（9-5）→ ホームに宝箱。開けたら 2. へ
  2. 「おかえり」のあとの解き直しがまだ → 易しい解き直し（9-5）
  3. 状態が `trying` のステップのうち、最後に開いたもの（書きかけ）
  4. コースの順で、最初の `cleared` でないステップ（近道ルートなら `optional` を飛ばす）
  5. 全部終わった → F-HOME-6 の表示
- 持ち時間（F-HOME-3）
  - 5分: 上の結果
  - 15分: 上の結果（あとは「つづける」で次々）
  - 30分以上: 今の章か前の章の手元課題に、未クリアの段階があればその最初の段階。無ければ上の結果
- 手元課題の段階はコースの並びに入れない（20分の課題が「次の1ステップ」に来て、壁1に戻らないように）。章の小問を全部終えると、ホームの手元課題の枠を目立たせる

### 9-2. レベル（F-LV-1）

- 点（クリアしたときに1回だけ。解き直しは別）

| 種類                           | 点              |
| ------------------------------ | --------------- |
| 説明カード                     | 1               |
| 予想・クイズ                   | 2               |
| 穴埋め・修理                   | 3               |
| 実装・絵                       | 4               |
| 手元課題の段階（Spring も）    | 10              |
| 解き直しの正解（後続 F-REV-1） | 1（1日2点まで） |

- ヒント3を見ても、手元で実行しても点は同じ（罰なし）
- レベル L になるのに必要な合計点: `T(L) = 10 × (L − 1) + floor((L − 1)² / 2)`
  - L2 = 10点（小問3〜4問）、L3 = 22、L5 = 48、L10 = 130、L20 = 370、L28 = 634
  - 本線の合計は約660点（カード37・小問110・手元課題の段階29）→ 全部終えると Lv 28 前後
- 今のレベル = `T(L) ≤ 合計点` となる最大の L。次までの残り = `T(L+1) − 合計点`
- レベルが上がったときだけ、クリアの表示に「Lv 4 → 5」を出す

### 9-3. 技カード（F-CARD）

- 各ステップの `concepts` に書いた技ごとに1枚
- 銅: その技を含むステップを初めてクリア
- 銀（後続）: 銅の日から7日以上あとに、その技を含むステップに正解（解き直しを含む）
- 金（後続）: 銀の日から30日以上あとに、同じく正解
- ランクは下がらない

### 9-4. エラー図鑑（F-DEX-1）

- 発見: 判定の結果（コンパイルエラー・例外・時間切れ・出力の上限）に、図鑑の項目が当たり、まだ `dex` に無い → `discoveredAt` など（エラーの行の前後3行を抜粋）を書く。トースト「エラー図鑑: 『;忘れ』を発見」
- 捕獲: 発見したステップで、そのあと全部の松明がともった → `capturedAt` と、直したコードの同じ場所を抜粋。トースト「『;忘れ』を捕獲」
- 別のステップで同じエラーが出ても、発見済みなら何もしない。捕獲していなければ、そのステップでクリアしたときに捕獲にする
- 手元で貼った結果（`where: 'local'`）も同じ。日本語の javac の文言にも当たる

### 9-5. おかえりの宝箱（F-BACK）

- 空いた日数 `gap = 今日 − meta.app.lastActiveAt の日`（日単位。端末の時刻）
- `gap ≥ 7` で宝箱を1つ置く（1回の「おかえり」で1つ）

| 空いた日数 | 宝箱 | 飾りの数 |
| ---------- | ---- | -------- |
| 7〜13      | 木   | 1        |
| 14〜27     | 銀   | 2        |
| 28 以上    | 金   | 3        |

- 飾りは `decorations.yaml` のうち、まだ持っていないものから、`開けた日時` を種にした決まった順で選ぶ（テストで再現できるように）。全部持っていれば「宝箱は空っぽ。でもおかえり」
- 点やレベルは増えない（レベルは「できたこと」だけ。01-decisions.md）
- 易しい解き直し: クリア済みの `easy: true` のステップのうち、最後にクリアした章のもの（無ければ直近にクリアした予想問題）。下書きは使わず、ひな形から。結果は `attempts` に残すが、点は付けない（後続の F-REV-1 では1点）
- 「休む」にした週が間にあっても、宝箱は同じように出る（休みは損にしない）

### 9-6. 今週は休む（F-REST-1）

- `restWeeks` に週の月曜日を入れる。今週と、先の週（地図・設定から）を選べる。取り消せる
- 効果は完走見込みの計算から外すことだけ。ほかの表示は変えない

### 9-7. 完走見込み（F-FC-1）

- 記号
  - `R` = 残りの本線の目安（分）= 公開済みで未クリアの必須ステップの `minutes` の合計 ＋ 手元課題の未クリアの段階の `minutes` ＋ 未公開の章の `plannedMinutes`（おかわりは含めない）
  - `k` = 実際の倍率 = クリア済みステップの `activeSeconds/60` の合計 ÷ その `minutes` の合計。0.7〜2.5 に収める。クリア済みが10ステップ未満なら 1.5
  - `P` = 1週の学習時間（分）= 今週を除く直近4週のうち、休みでない週の `sessions` の合計の平均（学習0分の週も含める）。そういう週が2つ未満なら 180（週3時間。画面に「仮」と出す）。下限 30
  - `W` = 必要な週の数 = `ceil(R × k ÷ P)`
- 見込みの日 = 今週から数えて、休みの週を飛ばしながら `W` 週目の日曜日
- 表示（地図の下に小さく。色は通常の文字色）
  - 見込み ≤ 2027-02-28: 「このペースなら ◯月◯日ごろ（3月は予備）」
  - 見込み > 2027-02-28: 「このペースなら ◯月◯日ごろ」と、後続 F-FC-2 では「おかわりを後回しにすると ◯月◯日ごろ」
- 赤・警告・「遅れ」の語は使わない

### 9-8. 学習時間の記録（F-LOG-1、F-PROJ-4）

- アプリの時間（`kind: 'app'`）
  - 数える条件: 画面が見えている（`visibilitychange`）かつ、最後の操作（キー入力・ポインター・エディタの変更）から5分以内
  - 1秒ごとに数え、30秒ごとと、画面が隠れたときに `sessions` を書く。開いていたステップの `progress.activeSeconds` にも足す
  - 画面が隠れて30分以上たったら、次は新しいセッション
- 手元課題の時間（`kind: 'local'`）
  - 「VS Code で始める」を押した時刻を `progress.localStartedAt` に書く
  - 貼るとき、初期値 = `min(今 − localStartedAt, 120分)`（押していなければ段階の `minutes`）。利用者が直せる（1〜600分）
- 日・週は開始時刻で決める（日をまたいでも分けない。簡単さを優先）

---

## 10. 質問文を作る（F-ASK）

### 10-1. 入れるもの

| 項目         | 中身                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| 前置き       | 「Java を学び直している専門学校生です。学習アプリの第◯章「◯◯」の問題を解いています」                   |
| 今の学習段階 | `course.yaml` の、今の章の `askStage`（例:「変数・if・for まで。配列・メソッドの宣言・クラスはまだ」） |
| 要望         | ヒントだけ（既定）／説明して／答えも（設定の既定値を、作るたびに切り替えられる）                       |
| 問題         | 題と `## 問題` の本文（Markdown のまま）                                                               |
| 自分のコード | エディタの中身（全部）。手元課題は貼った出力から分かるファイル名だけ（コードは自分で足す、と書く）     |
| 結果         | コンパイルエラーの原文と行、例外の型と行、失敗したケースの期待と実際（各20行まで）、出力の最後の40行   |
| 自分の予想   | 「どこが怪しいと思う？」の1行（空なら見出しごと消す）                                                  |
| 試したこと   | 任意の1行（空なら見出しごと消す）                                                                      |
| 環境         | 「ブラウザ内の Java（teavm-javac。標準ライブラリは Java 21 相当）」または「JDK 25（Temurin）」         |
| 入れないもの | 模範解答、ヒント3、テストの中身（失敗したものの名前と値だけ）                                          |

- 全体が 12,000文字を超えたら、出力・期待・実際を後ろから削る（コードは削らない）

### 10-2. テンプレート

````markdown
Java を学び直している専門学校生です。学習アプリの第{章番号}章「{章の題}」の問題「{問題の題}」を解いています。
今の学習段階: {askStage}
{要望の文}

## 問題

{問題文}

## 自分のコード

```java
{コード}
```

## 結果

```
{結果}
```

## 自分の予想

{予想}

## 試したこと

{試したこと}

## 環境

{環境}
````

- 要望の文
  - ヒントだけ: 「答えのコードは書かずに、考え方のヒントを1つだけください。まだ習っていない書き方は使わないでください。」
  - 説明して: 「なぜこうなるのかを説明してください。直し方は方向だけで、答えのコードは書かないでください。」
  - 答えも: 「直したコードと、その理由を説明してください。まだ習っていない書き方は使わないでください。」
- 「コピーして Claude を開く」: `navigator.clipboard.writeText` → `window.open('https://claude.ai/new', '_blank', 'noopener')`。コピーできないときは、文章を選択した状態のテキスト欄を出す
- 手元課題の `.jq-ask.md` も同じテンプレート（`Check.java` が Java で作る。要望は「ヒントだけ」固定）

---

## 11. PWA

### 11-1. 設定（vite-plugin-pwa、generateSW）

```ts
VitePWA({
  registerType: 'prompt', // 書いている途中に勝手に再読み込みしない（F-SET-4）
  injectRegister: false, // 登録は useRegisterSW で、表示のあとに
  manifest: {
    name: 'Java ダンジョン工房',
    short_name: 'ダンジョン工房',
    lang: 'ja',
    start_url: '/java-study-tracker/',
    scope: '/java-study-tracker/',
    display: 'standalone',
    background_color: '#0b0d12',
    theme_color: '#0b0d12',
    icons: [/* 192・512・maskable 512（public/icons/） */],
  },
  workbox: {
    cacheId: 'java-study-tracker', // 同じオリジンのほかのサイトと分ける
    globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
    globIgnores: ['java/**', 'java-quest/**'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/java-study-tracker/java/'),
        handler: 'CacheFirst', // フォルダ名に版があるので、中身は変わらない
        options: { cacheName: 'java-study-tracker-teavm-0.17.0-pg4-shim1' },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/java-study-tracker/java-quest/'),
        handler: 'NetworkFirst',
        options: { cacheName: 'java-study-tracker-workspace' },
      },
    ],
  },
});
```

### 11-2. teavm-javac（約7.6MB）の扱い

- 事前キャッシュ（precache）には入れない
  - 理由: Service Worker のインストールで毎回 7.6MB を落とすことになり、1つでも失敗するとインストール全体が失敗する。Workbox の既定の上限（2MiB）も超える
- 代わりに、実行時のキャッシュ（CacheFirst）に入れる。先読み（4-10）で `fetch` したものがそのままキャッシュされる → 2回目からオフラインで動く
- 「オフライン用に保存済み」の判定: `caches.open(cacheName)` に全ファイルがあるか（設定画面）
- 版を上げたら、起動時に `java-study-tracker-teavm-` で始まる古いキャッシュを消す（`cleanupOutdatedCaches` は事前キャッシュしか消さないため）
- 教材の JSON（`chNN.json`）と画面は事前キャッシュする（合計数百KB の見込み）
- GitHub Pages が `.wasm` を gzip で返すかは未確認（15章）。返さない場合でも初回 7.6MB で、PC の回線なら許容（critic-tech）

### 11-3. 更新

- 新しい版があると、ヘッダーに「更新があります [更新する]」。押すと `updateServiceWorker(true)`
- 書きかけは自動保存しているので、更新で失われない

---

## 12. CI

### 12-1. ジョブ（`.github/workflows/ci.yml`）

| ジョブ    | 中身                                                                                                                                                                                                                        | 時間の目安                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `check`   | 今まで: lint・整形・型チェック・テスト（Vitest）・ビルド。足す: `teavm:verify`（SHA256SUMS の照合）。`content:build` は `pre*` で自動                                                                                       | 5分                          |
| `content` | `actions/setup-java`（temurin、`java/JDK_VERSION` の版）→ `npm ci` → `classlib:verify` → `content:verify`（キャッシュつき）→ `workspace:build` → 作業フォルダの検証 → teavm の本物を使う Vitest（`vitest --project teavm`） | 変わった問題だけなら 3〜10分 |
| `e2e`     | `npm ci` → `npx playwright install --with-deps chromium webkit` → `npm run build` → `vite preview --port 4317` → Playwright                                                                                                 | 5分                          |

```yaml
content:
  name: 教材の検証（JDK 25 と teavm-javac）
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with: { node-version-file: .nvmrc, cache: npm }
    - uses: actions/setup-java@v5 # 版は導入時に最新を確かめる（未確認）
      with:
        distribution: temurin
        java-version-file: java/JDK_VERSION # 使えなければ java-version: '25.0.5'
    - run: npm ci
    - uses: actions/cache@v4 # 版は導入時に確かめる
      with:
        path: .cache/content-verify
        key: content-verify-${{ hashFiles('content/**', 'java/**', 'scripts/**', 'public/java/**') }}
        restore-keys: content-verify-
    - run: npm run classlib:verify
    - run: npm run content:verify -- --jobs 4
    - run: npm run workspace:verify
    - run: npm run test:teavm
```

- `actions/setup-java` に JDK 25 を入れる。`java-version-file` で `java/JDK_VERSION` を読む（`.java-version` 形式。使えるかは導入時に確かめる）
- `npm test`（`check` ジョブ）は JDK も teavm も使わない。teavm を使うテストは `test:teavm` に分ける（`npm test` を速く保つ）
- Spring Boot（p09）: 別のワークフロー `content-spring.yml`。`on.push.paths: ['content/projects/p09/**']` のときだけ `./mvnw -B test`

### 12-2. Playwright のテスト（数本だけ）

- Chromium と WebKit（WebKit で teavm-javac が動くかは未確認。動かなければ WebKit は「非対応の表示が出る」ことを確かめるテストに変える）
- テスト
  1. 初回起動 → ホームに第0章の最初のステップ → 小問を解いて松明が全部ともる
  2. 無限ループのコード → 時間切れの表示、画面は固まらない
  3. v1 のデータを入れた状態で起動 → 旧記録に v1 のメモが出る
  4. 2回目の起動でオフライン（`context.setOffline(true)`）→ 実行できる
- `base: '/java-study-tracker/'` のまま `vite preview` で動かす

### 12-3. 公開（deploy.yml）

- 変更なし（main の CI が通ったら公開）。`npm run build` が `content:build` と `workspace:build` を含むので、教材と zip も公開される
- revamp ブランチは公開されない。main へのマージはユーザーの判断（00-brief.md）

---

## 13. 実装フェーズ

- 原則: 教材の形式と検証を早く作り、教材の作成（別エージェント）を実装と並行させる
- 各フェーズの終わりに、lint・整形・型チェック・テスト・ビルド・（あれば）content・e2e がすべて通った状態でコミット

| フェーズ             | 中身                                                                                                                                                                                                                                                                                                 | 完了の条件                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 確認（半日）       | 15章の未確認のうち、作り始める前に要るもの: Safari・Chrome で teavm-javac（research のテストページを利用者の Mac で）、Playwright WebKit、vite-plugin-pwa 2.0 と Vite 8 のビルド（scratchpad の空のプロジェクト）、CodeMirror の Java の色付け、`JqCheck.java` の `class` 形                         | 結果を `docs/revamp/04-spikes.md` に記録。動かないものがあれば、まとめ役に設計の修正を相談                                                              |
| 1 Java と教材の土台  | teavm-javac の同梱（SHA256SUMS・SOURCE.md・THIRD_PARTY_NOTICES.md）、Scanner の代わりと classlib-patch、ハーネス（5章）、外枠、`src/content/schema.ts`、content-build、content-verify、`tests/content-fixtures/`、CI の `content` ジョブ、見本の教材3問（予想・実装・修理）                          | CI の `content` が通る。壊した見本を content-verify が全部落とす。**ここから教材の作成を並行で始められる**                                              |
| 2 ブラウザでの実行   | 2つの Worker、`JavaRunner`・`teavmRunner`・`fakeRunner`、エラーの整形、図鑑の判定（文言・型）、対応ブラウザの判定、先読み、`#/dev/java`、CSP                                                                                                                                                         | Playwright（Chromium）で見本の問題が判定される。時間切れ・出力の上限のテストが通る。2回目の実行が中央値 1.5秒以内                                       |
| 3 データと骨組み     | v2 の DB、v1 からの移行、エクスポート・インポート、v1 の画面とロジックの削除（2-2）、ルーティング・レイアウト・設定・記録（旧記録）                                                                                                                                                                  | v1 の作ったデータで移行のテスト（fake-indexeddb）と e2e が通る。v1 の DB に書き込んでいないことをテストで確かめる                                       |
| 4 学習の画面         | ホーム、ステップ（カード・予想・穴埋め・修理・実装・絵）、タイル、松明、ヒント、書きかけの保存、質問文、エラー図鑑、レベル、技カード（銅）、宝箱と解き直し、休む、完走見込み、時間の記録、地図、作品、図鑑                                                                                           | 12-2 の 1・2 が通る。domain の単体テストが揃う。画面のテスト（RTL、偽の JavaRunner）                                                                    |
| 5 手元課題と PWA     | workspace-build、`Check.java`、クリアコード、出力の貼り付け、`JqCheck.java`、準備の手順、PWA（11章）、ライセンス画面                                                                                                                                                                                 | CI で全手元課題の `Check.java` が通る。12-2 の 4（オフライン）が通る。手元で zip を展開して `Cmd+Shift+B` が動く（エージェントが手元の JDK で確かめる） |
| 6 MVP の教材と仕上げ | 第0〜2章（カード11・小問32・p00〜p02）をレビュー済みに、README・スクリーンショット                                                                                                                                                                                                                   | 全部 `reviewed: true` で CI が通る。**ここで MVP 完了。main への反映と公開はユーザーに確認する**                                                        |
| 7〜 後続             | 02-requirements.md の「後」の番号順: 1 クイズ（第9章に必要）、2 並べ替え、3 解き直し（ライトナー）・技カードの銀金・魔物のタイル、4 近道ルート、5（教材: 第3章以降を常に2章先まで）、6 `#/clear/` の受け取り、7 分かったこと、8 振り返り、9 色とコマ送り、10 旧データの削除、11 ログイン時に開く案内 | 項目ごとにテストと CI                                                                                                                                   |

- 教材の作成の順番（フェーズ1の完了後、並行）: 第0章 → 第1章 → 第2章（MVP）→ 第3章（利用者が第1章を終える前）→ 以後「2章先まで」
- 利用者の勉強を止めない: フェーズ6を待たず、フェーズ4の途中でも第0章が動けば revamp ブランチの `npm run dev` で始められる（5-1 の critic-user の指摘）。ただし公開は MVP 完了後

---

## 14. テスト方針

| 層                | 道具                                   | 対象                                                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 純粋関数          | Vitest（node 環境）                    | `domain/` 全部: 外枠、プロトコルの読み取り、差分、予想の正規化、タイルの配置と全角、クリアコード（共通テストデータ）、`Check` の出力の読み取り、次のステップ、レベル、技カード、図鑑、宝箱（日付の境目 6/7/13/14/27/28 日）、休み、完走見込み、移行の変換、エクスポートの形、質問文。目標カバレッジ 90% |
| 教材のスキーマ    | Vitest                                 | `content/schema.ts`（正しい例と、項目ごとの間違いの例）、content-build（`tests/content-fixtures/`）                                                                                                                                                                                                     |
| DB                | Vitest＋fake-indexeddb（v1 と同じ）    | リポジトリ、移行（v1 の DB を作って入れる → 移行 → v1 が変わっていない）、インポート（v1 形式・v2 形式・壊れたもの）                                                                                                                                                                                    |
| 画面              | Vitest＋Testing Library（jsdom）       | ホーム、ステップ（`fakeRunner` で結果を返す）、手元課題の貼り付け、図鑑、設定。キーボード操作と `aria-live`                                                                                                                                                                                             |
| Java 実行の中心   | Vitest（node、`--project teavm`）      | `runtime/java/core/` を本物の teavm-javac で: Hello、コンパイルエラーの行と列、例外の型、Scanner の代わり、判定の行、`System.exit`、StackOverflow                                                                                                                                                       |
| Worker を含む通し | Playwright（Chromium・WebKit）         | 12-2 の4本                                                                                                                                                                                                                                                                                              |
| 教材              | content-verify（CI の content ジョブ） | 6-9 の表                                                                                                                                                                                                                                                                                                |
| ハーネス（Java）  | content-verify の中で                  | 共通テストデータ（外枠・クリアコード）、`JqText.normalize`、JSON のエスケープ（改行・引用符・制御文字・絵文字）                                                                                                                                                                                         |

- jsdom では Worker と Wasm が動かないので、画面のテストは `JavaRunner` を偽物に差し替える（critic-tech 4-4）
- 時刻を使うものは v1 の `tests/time.ts` の作り方で固定する
- 学習者が解く問題の答えをテストに書かない（ネタバレを避けるため、画面のテストは見本の教材 `tests/content-fixtures/` を使う）

---

## 15. 未確認のことと確かめ方

| 未確認                                                                                           | 分かっていること                                                                                       | 確かめ方                                                                                                                                                       | いつ                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Safari 18.2・Firefox 120 で teavm-javac が動くか                                                 | Chrome 158・Node 24 では動く（research）。WasmGC の対応版は表のとおり                                  | research のテストページを利用者の Mac の Safari・Chrome で開く（`safaridriver` で自動にできれば自動、無理なら利用者に依頼）                                    | フェーズ0                         |
| Playwright の WebKit で動くか                                                                    | —                                                                                                      | `@playwright/test` 1.65.1 の WebKit でテストページを開く                                                                                                       | フェーズ0                         |
| vite-plugin-pwa と Vite 8 の互換                                                                 | `vite-plugin-pwa` 2.0.0 の peerDependencies に `vite ^8.0.0` がある（npm で確認）。workbox-build 7.4.1 | scratchpad で Vite 8.3.8＋React＋vite-plugin-pwa 2.0.0 の空のプロジェクトを `vite build` し、`sw.js` とマニフェストが出るか見る                                | フェーズ0                         |
| CodeMirror の Java モードの色付け                                                                | `@codemirror/lang-java` 6.0.2（`@lezer/java` ^1.0.0、最新 1.2.1）                                      | コンパクトソース・`record` パターン・`_`・テキストブロックを入れて、構文木にエラーの節が出ないかをテストで見る。崩れても色が付かないだけで、実行には影響しない | フェーズ0                         |
| GitHub Pages が大きな `.wasm` を gzip で返すか                                                   | mdn.github.io の 83バイトの `.wasm` は圧縮なし、HTML は gzip（実測。`cache-control: max-age=600`）     | 1MB 以上の `.wasm` を置いている github.io のサイトを `curl -sI -H 'Accept-Encoding: gzip'` で見る。無ければ MVP 公開後に自分の URL で見る                      | フェーズ0（見られなければ公開後） |
| teavm-javac の JS が CSP（`eval` なし）で動くか                                                  | —                                                                                                      | `#/dev/java` に CSP の `<meta>` を付けて Chrome・Safari で動かす                                                                                               | フェーズ2                         |
| WasmGC の判定用の最小モジュール                                                                  | —                                                                                                      | 候補のバイト列を各ブラウザの `WebAssembly.validate` で確かめる                                                                                                 | フェーズ2                         |
| teavm-javac で例外の行番号が取れるか                                                             | deobfuscator を入れると行番号が出る（research）                                                        | `getStackTrace()` の中身を `#/dev/java` で見る。取れなければ行は出さない                                                                                       | フェーズ2                         |
| teavm-javac の javac の英語の文言が JDK と同じか                                                 | 同じ jdk25u の javac のはず                                                                            | `errors-fixtures` で CI が確かめる                                                                                                                             | フェーズ1                         |
| `JqCheck.java`（`public class Main` を含む1ファイル）が `java JqCheck.java` で動くか             | `compact` の形は実測で動いた。JEP 330 はファイル名の決まりを問わないと書いている                       | フェーズ1で `class` の形を手元の JDK 25 で動かす                                                                                                               | フェーズ1                         |
| VS Code の Java 拡張が章ごとの同じ名前のクラスを重複エラーにするか                               | —                                                                                                      | 作業フォルダを VS Code で開き、拡張（Extension Pack for Java）を入れた状態で見る。だめなら「章のフォルダだけを開く」（`code ~/java-quest/ch03`）と案内         | フェーズ5                         |
| `actions/setup-java` の `java-version-file` で `java/JDK_VERSION` を読めるか、各 action の最新版 | v1 の CI は `checkout@v7`・`setup-node@v7`                                                             | 導入時に各 action の README で確かめる。だめなら `java-version: '25.0.5'` を直接書く                                                                           | フェーズ1                         |
| macOS で PWA をログイン時に開けるか                                                              | —                                                                                                      | Chrome・Safari の PWA を「システム設定 > 一般 > ログイン項目」に足せるか試す                                                                                   | 後続 11                           |
| Spring Boot 4.0 系と JDK 25                                                                      | —                                                                                                      | Spring Boot の公式ドキュメントの System Requirements を読む。Spring Initializr（start.spring.io）で Java 25 を選んだプロジェクトを手元で `./mvnw test`         | 第9章の作成前                     |
| JUnit を使った Spring のテスト（MockMvc の設定が 4.0 で変わったか）                              | —                                                                                                      | 上と同じプロジェクトで `@SpringBootTest` を1本動かす。p09 はまず Service の単体テストだけにする                                                                | 第9章の作成前                     |

### この設計のための実測（2026-11-27、scratchpad。リポジトリは変更していない）

- コンパクトソースのクラスは、別ファイルから名前で参照できない（javac: シンボルを見つけられません）→ 外枠（4-5）
- `import module java.base; final class Main { ... }` に包むと、teavm-javac・JDK 25 の両方で、判定のクラスから `new Main().twice(5)` と `new Main().main()` を呼べる
- コンパクトソースの暗黙の import（`List` など）は teavm-javac でも動く
- teavm-javac には `System.setIn` が無い（コンパイルエラー）→ `StdinBridge` を2つ用意
- 1ファイルに `import module java.base;`・入口のクラス・包んだ `Main` を並べたものは `java Run.java` で動く（`compact` の形）
- javac の日本語・英語の文言（4-8 の表）
- Node 24.15.0 で `.ts` を直接実行できる（型の除去）
- npm: `vite-plugin-pwa` 2.0.0（peer `vite ^8.0.0`）、`@codemirror/lang-java` 6.0.2、`@lezer/java` 1.2.1、`@playwright/test` 1.65.1、`yaml` 2.9.1、`fflate` 0.8.3

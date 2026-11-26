# 設計書：Java 学習アプリ v2（java-study-tracker 全面改修）

- 版: 第2版 2026-11-27（[reviews/spec-review.md](reviews/spec-review.md)・[04-spikes.md](04-spikes.md)・[05-visual-design.md](05-visual-design.md) を反映。指摘ごとの対応は [reviews/spec-review-response.md](reviews/spec-review-response.md)）
- 作成: 2026-11-27（設計担当）
- 要件: [02-requirements.md](02-requirements.md)（機能 ID はここを参照）
- 優先順位: [01-decisions.md](01-decisions.md) ＞ 本書 ＞ [reviews/critic-tech.md](reviews/critic-tech.md)。画面の見た目と配置は [05-visual-design.md](05-visual-design.md) が正本（1章はそこに載せる要素の一覧）
- 表記
  - 「未確認」= 確かめていない。確かめ方は15章
  - 「（実測）」= 2026-11-27 に手元の JDK 25.0.5、teavm-javac（teavm.org/playground/4 の配布物）、Node 24.15.0 で確かめた
  - 「（スパイク）」= 04-spikes.md で確かめた（Chrome 158、Playwright 1.65.1 の Chromium・WebKit、Vite 8.3.8 ＋ vite-plugin-pwa 2.0.0）
- アプリ名は仮に「Java ダンジョン工房」。リポジトリ名・URL（`https://asahi1999.github.io/java-study-tracker/`）は変えない

---

## 0. 設計の要点

- 画面は React 18 + TS + Vite + Tailwind 3（v1 を継続）。データは Dexie の新しい DB `java-study-tracker-v2`
- Java はブラウザ内で teavm-javac を Web Worker で動かす。判定は **ブラウザ・手元・CI で同じ Java のハーネス**を使う
- 教材は1問1フォルダの本物の `.java`。CI で JDK 25 と teavm-javac の両方で実行し、出力の一致を確かめる
- 世界観（ダンジョン）は見た目の皮だけ。データ・判定・ID に持ち込まない（例: タイルの名前は描画だけで使う）
- 計算（次のステップ、レベル、見込み、クリアコード、タイル、移行）は `src/domain/` の純粋関数
- 対象のブラウザは Chrome（02-requirements.md N-BR）。ほかのブラウザでは「Chrome で開く」の案内と「手元で実行して結果を貼る」で進める
- 作る順番は「第0章で遊べる」を最優先にする（13章）

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
   Service Worker（vite-plugin-pwa、clientsClaim）: アプリ本体は事前キャッシュ、teavm-javac とフォントは初回利用時にキャッシュ
```

---

## 1. 画面

### 1-1. 画面一覧

| 画面             | URL（HashRouter）                     | 要件                                | 区分 |
| ---------------- | ------------------------------------- | ----------------------------------- | ---- |
| ホーム           | `#/`                                  | F-HOME-1〜6、F-BACK、F-REST、F-FC-1 | MVP  |
| ステップ         | `#/step/:stepId`                      | F-STEP、F-RUN、F-TILE、F-ASK        | MVP  |
| 手元課題         | `#/project/:projectId`                | F-PROJ                              | MVP  |
| 地図             | `#/map`                               | F-MAP-1                             | MVP  |
| 作品             | `#/works`                             | F-WORK                              | MVP  |
| 図鑑             | `#/dex`（タブ: 技カード／エラー）     | F-CARD、F-DEX                       | MVP  |
| 記録             | `#/journal`（タブ: この記録／旧記録） | F-LOG                               | MVP  |
| 設定             | `#/settings`                          | F-SET、F-DATA                       | MVP  |
| 準備の手順       | `#/setup`                             | F-SETUP-1                           | MVP  |
| ライセンス       | `#/licenses`                          | F-SET-3                             | MVP  |
| クリアの受け取り | `#/clear/:code`                       | F-PROJ-6                            | 後続 |
| Java の動作確認  | `#/dev/java`                          | 開発用（本番ビルドに入れない）      | MVP  |
| 見つからない     | `*`                                   | v1 の NotFoundPage を流用           | MVP  |

### 1-2. 画面遷移

```
               +--------------------- ヘッダーのナビ（どの画面からも） ---------------------+
               |   地図  作品  図鑑  記録  設定                                              |
               v                                                                             |
[ホーム] --つづける--> [ステップ] --クリア--> 次のステップ（同じ画面で切り替え）
   |  \                    |  \--ここで終える--> [ホーム]
   |   \--持ち時間30分以上--> [手元課題] --貼る--> クリア表示 --> [ホーム]
   |--宝箱の帯（7日以上空いた）--> 宝箱のモーダル --1問だけやる--> 易しい解き直し（[ステップ]）
   |                                          \--あとで開ける--> [ホーム]（宝箱は残る）
   |--インストールのカード（Chrome のみ）--> [準備の手順]
   |--移行に失敗した帯--> v1 のデータを JSON で書き出す
[地図] --> [ステップ] / [手元課題]
[設定] --> [準備の手順] / [ライセンス] / エクスポート・インポート（モーダル）
[記録] --旧記録タブ--> v1 の週のメモ（Markdown、読むだけ）
```

- ナビは PC では上部の横並び、スマホ幅（< 768px）では下部のバー（v1 の BottomNav を作り直す）
- ステップ画面ではヘッダーを細くし、作業の邪魔をしない

### 1-3. ワイヤーフレーム（文字）

- 見た目・配置・列の幅・文言の細部は 05-visual-design.md（5章・7章、モック `mockups/`）が正本。ここは「何を載せるか」と、データとのつながりだけ

#### ホーム（05-visual-design.md 5-1・7-3、`mockups/home.html`）

```
+--------------------------------------------------------------------------------+
| [松明] Java ダンジョン工房          地図 作品 図鑑 記録 設定   Lv 7 [####] 次まで 4 ステップ |
+--------------------------------------------------------------------------------+
| (おかえり。宝箱があります [開ける])  ← 宝箱があるときだけ                         |
| +-- 次の1ステップ --------------------+  +-- 作品 ちいさなダンジョン v0.3 ------+ |
| | 第4章 配列 ／ 部品 4-5 ／ ステップ 2/3 |  | （最新のタイル絵。行注釈つき）       | |
| | canMove を書いて、壁の前で止まる     |  | v0.3  v0.4(いまここ)  v0.6 ... v1.0 | |
| | 問題文の冒頭3行                      |  +-------------------------------------+ |
| | [約2分] [ブラウザで実行] [実装]       |                                          |
| | 前回の続き（最大5行）  自動保存 22:41 |                                          |
| | できあがるとこうなる（完成図 8px）    |                                          |
| | [ > つづける  Enter ]                 |                                          |
| | このステップだけで終えてOK。…         |                                          |
| | この部品: [済]迷路を読む [今]canMove [ ]階段まで |                               |
| | 持ち時間 [5分] [15分] [30分以上]      |                                          |
| +--------------------------------------+                                          |
| +-- 技カード 12/41 --+ +-- エラー図鑑 5 発見 --+ +-- ペース -------------------+ |
| | 最後の3枚         | | 最近の3件（発見/捕獲） | | このままなら 2/18 ごろ（3月は予備） | |
| +-------------------+ +-----------------------+ | [ 今週は Java を休む ]          | |
|                                                  +---------------------------------+ |
|                                                               Java: 準備完了     |
+--------------------------------------------------------------------------------+
```

- 「次の1ステップ」のカードは、問題文の冒頭3行までを出す（クリック0回で読める）
- 「前回の続き」は `drafts` の書きかけがあるときだけ。`Draft.cursorLine` を中心に最大5行（3-2）
- 「できあがるとこうなる」は、`render: tiles` の問題で、最初の判定のケースの期待する出力（8px のタイル）と前書きの `goal`（1行）。どちらも無ければ出さない
- 「この部品」は、同じ部品（`part`。6-2）のステップの並び
- 宝箱があるときは、カードの上に「おかえり。宝箱があります [開ける]」を出す。次のステップは隠さない
- 「今週は休む」を押した週は、ボタンが「今週は休みにしています [取り消す]」に変わる。ほかに表示は変えない
- 「Java: 準備中 37%」「Java: このブラウザでは動きません [詳しく]」は右下に小さく
- 移行に失敗したとき（3-3）: 一番上に閉じられる帯「v1 の記録を読み込めませんでした ［v1 のデータを JSON で書き出す］ ［詳しく（設定）］」

#### ステップ（穴埋め・修理・実装・絵。05-visual-design.md 5-2・7-4〜7-7、`mockups/problem.html`）

```
+--------------------------------------------------------------------------------+
| ホーム / 第4章 配列 / 4-5 壁にぶつかる  ステップ 2/3  約2分  自動保存済み  Lv 7 |
+--------------------------+---------------------------+-------------------------+
| [実装]                    | Main.java  [最初のコードに戻す] | テスト  3 / 4 本ともった |
| 題名                      | ▼ 書くのはここ（2行目）    | [火][火][火][  ]        |
| 問題文（Markdown）        | 1 boolean canMove(...) {   |  名前（2行まで）        |
|                          | 2     return ...;          | 出力 [タイル][文字]      |
| ヒント [1] [2を見る] [3]  | ▸ 13〜30行：…（読むだけ）  | 文字 | タイル（行注釈）  |
| [ 質問文を作る ]          |                           | 期待と実際の差分（行ごと）|
| [ 手元で実行 ]            | [実行 ⌘Enter] コンパイル OK・実行 0.7 秒 | 手元の VS Code で動かしても… |
|                          | Esc → Tab でエディタから出る | (ステップクリア / 解説 / Lv 7→8 / 技カード) |
|                          |                           | [次のステップへ（約3分）] [ここで終える] |
+--------------------------+---------------------------+-------------------------+
| [問題を報告] は問題文の列の下                                                    |
+--------------------------------------------------------------------------------+
```

- 列の幅と、幅が狭いときの並び方は 05-visual-design.md 5-2
- コンパイルエラー（`mockups/problem-error.html`）: エディタの行に印と1行の説明。結果の列の一番上に、初めてのエラーなら図鑑の発見カード、その下に「エラーの説明」（何が起きた → よくある原因 → ［◯行目へ移動］ → 元のメッセージ）。松明は「コンパイルが通ると松明に火が入ります」
- 「質問文を作る」は、同じステップで2回失敗かエラーのとき、枠を光らせる（いつでも押せる）
- ブラウザと本物で結果が変わりうる書き方があるときだけ、出力の下の1行を F-RUN-7 の注意に替える（4-7）

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
+--------------------------------------------------------------------------------+
```

- 完走見込みはホームの「ペース」に出す（05-visual-design.md 5-1）。地図には出さない

- 各マスはステップへのリンク（題名を title と aria-label に入れる）。鍵はかけない
- おかわりのステップは点線の枠

#### 作品

```
+--------------------------------------------------------------------------------+
| 作品  ちいさなダンジョン v0.3                                                  |
| 第0章 入口       [自分の出力のタイル絵]  [ ]                                    |
| 第1章 ステータス [タイル絵]                                                    |
| 第3章 マップ     [タイル絵]                                                    |
| 絵をクリック → そのときの自分のコード（読み取り専用）と出力                     |
+--------------------------------------------------------------------------------+
```

- タイルはおみやげの見た目（F-WORK-2、9-5）で描く
- 「今の版」= 必須のステップを全部クリアした章のうち、一番大きい章の `dungeon.version`。まだ無ければ「v0.0（作りかけ）」

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
- 並べるのは、学習時間が1分以上の週と、休みにした週だけ（0分の週は並べない）

#### 設定

```
| テーマ: (ライト)(ダーク)(システム)    タイルの大きさ: 16 / 24 / 32            |
| おみやげの見た目: 床 [ふつう | 苔の石畳]（持っているものだけ）                  |
| Java 実行環境: 準備完了（teavm-javac 0.17.0-pg4、オフライン用に保存済み）      |
|   [もう一度ダウンロード]  [もう一度確かめる]  対応ブラウザの説明（Chrome）      |
| データ: [エクスポート] [インポート]                                            |
| v1 からの移行: 済（12/1 09:12） / 失敗（理由） [v1 のデータから読み直す]        |
|   [v1 のデータを JSON で書き出す]（v1 の DB が無ければ押せない。理由を横に）    |
| アプリの更新: [更新する]（あるときだけ）   [準備の手順] [ライセンス]  版 2.0.0  |
```

- 質問文の要望は、作るたびに選ぶ（既定値の設定は持たない）
- 休みは「今週」だけなので、ホームのボタンで足りる。設定には出さない

---

## 2. ディレクトリ構成

### 2-1. v2 の構成

```
content/                         # 教材（7章の形式）
  course.yaml                    # 章の順番・題・部品・使ってよい文法・作品の版
  concepts.yaml                  # 技カード
  errors.yaml                    # エラー図鑑
  gifts.yaml                     # 宝箱のおみやげ（タイルの見た目の替え）
  ids.lock                       # 公開済みの ID と rev・中身のハッシュ（6-8）
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
  test-vectors/                  # 共通テストデータ（JSON）: wrap・clear-code・cases（JqCases の生成）・protocol（判定の行の読み取り）・scanner（Scanner の適合）・double（表示の一致）
public/
  java/teavm-javac/0.17.0-pg4/   # 固定した teavm-javac ＋ SHA256SUMS ＋ SOURCE.md ＋ THIRD_PARTY_NOTICES.md
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
    java/        wrap.ts protocol.ts diagnostics.ts jqCheckFile.ts precheck.ts prohibited.ts
    judge/       normalize.ts diff.ts predict.ts
    tiles/       tileTable.ts layout.ts
    progress/    nextStep.ts level.ts cards.ts dex.ts welcome.ts forecast.ts week.ts
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
    v1/v1Export.ts               # v1 の DB を読んで、v1 と同じ形式の JSON を作る（F-DATA-4）
    persistence.ts themeCache.ts # v1 から
  components/ ui/（v1 から） editor/（CodeMirror） tiles/（TileView） torch/（松明）
  hooks/ stores/ lib/
tests/
  setup.ts factories.ts matchMedia.ts time.ts
  fixtures/v1/                   # v1 のデータ（v1 の seed.ts・createBackup で作ったもの。利用者のものではない。14章）
  content-fixtures/              # わざと壊した教材（content-verify のテスト）
  e2e/                           # Playwright
playwright.config.ts
```

### 2-2. v1 から消す・残す・作る

- 01-decisions.md により v1 の画面とロジックは消してよい。フェーズ1 では v1 の画面をルートから外すだけにし、ファイルを消すのはフェーズ3（13章）

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
| 作る       | 2-1 の `content/` `java/` `scripts/` `src/{domain,runtime,content}`、`public/java/`、`tests/e2e/`、`playwright.config.ts`                                                                                                     |                                                                |
| 足す依存   | `@codemirror/lang-java` `codemirror`（または `@codemirror/view` ほか）、`vite-plugin-pwa`、`yaml`、`fflate`、`@fontsource/ibm-plex-mono`・DotGothic16（05-visual-design.md 4-3）、開発用 `@playwright/test`                   | 版は導入時に `npm view` で確かめて固定（v1 と同じく `^` なし） |

- 開発サーバーは決まったポートで動かす（`vite --port 5179 --strictPort --open`。5179 は仮。他で使っているポート 3000・3001・5000・7000 を避け、導入時に空きを確かめて決める）。ポートが変わると IndexedDB のオリジンが変わり、学んだ記録が見えなくなるため、使われていたら別のポートに移らずに止める（02-requirements.md N-DATA-7）
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

- フェーズ1（13章）から、この全表を `version(1)` で定義する（使うのは `meta`・`progress`・`drafts`・`attempts` から）。フェーズ1 で学んだ記録を、あとのフェーズでもそのまま使い、公開のときにエクスポートで本番に移すため

- ID は `crypto.randomUUID()`（v1 と同じ。インポートで混ぜやすい）
- 日付は `YYYY-MM-DD`（端末の時刻）、日時は ISO 文字列
- 週は月曜はじまり。`weekStart` はその週の月曜日 `YYYY-MM-DD`

### 3-2. 型

```ts
type StepId = string; // 小問・カード: 'ch02.torch-row'、手元課題の段階: 'p02.walls'（段階の slug。6-6）
type ChapterId = string; // 'ch02'

type Progress = {
  stepId: StepId;
  chapterId: ChapterId;
  kind: 'card' | 'problem' | 'project-stage';
  status: 'new' | 'trying' | 'cleared'; // trying になるのは、コードを変えたか実行したか答えたとき（開いただけでは変わらない）
  firstOpenedAt: string | null;
  lastOpenedAt: string | null; // 次のステップの選び方（9-1）に使う
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

type Draft = {
  stepId: StepId;
  rev: number; // 書き始めたときの教材の rev。今の rev と違えば知らせる（F-STEP-13）
  files: Record<string, string>;
  cursorLine: number | null; // ホームの「前回の続き」の中心の行（05-visual-design.md 7-3）
  updatedAt: string;
};

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
  grade: 'wood' | 'silver' | 'gold'; // 見た目だけ
  gift: string | null; // gifts.yaml の ID。全部もらったあとは null
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
  tileSize: 16 | 24 | 32;
  skins: Record<string, string>; // タイル名 → 使うおみやげの ID（例: { floor: 'floor-moss' }）。無ければふつうの絵
};
type MetaMigration = {
  key: 'migration';
  status: 'done' | 'not-found' | 'failed'; // failed は次の起動で読み直す（3-3）
  at: string;
  error: string | null;
  hasLegacy: boolean; // 旧記録ありと判定したか（3-3）
};
type MetaWelcome = {
  key: 'welcome';
  pendingChest: { gapDays: number; grade: 'wood' | 'silver' | 'gold' } | null; // 置いたが、まだ開けていない宝箱
  pendingReview: boolean; // 「おかえり」のあとの解き直しがまだ
  at: string;
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
- 教材の ID が消えた・変わったときの記録（`progress`・`drafts` など）は消さない。表示するときに、今のコースに無い ID は飛ばす（画面が壊れないこと。14章）

### 3-3. v1 からの移行

#### 手順（起動時、`useAppBootstrap`）

1. v2 の DB を開く。`meta.migration` の `status` が `done` か `not-found` なら何もしない（`failed` と、まだ無いときは 2. へ。失敗は起動のたびに読み直す）
2. `Dexie.exists('java-study-tracker')` で v1 の DB があるか見る
   - 無ければ `migration = { status: 'not-found' }` を書いて終わり（`new Dexie(name).open()` は DB を作ってしまうので、先に確かめる）
3. v1 の DB を v1 と同じスキーマ（`version(1).stores({...})`）で開き、読み取りのトランザクションで全表を読む。すぐ閉じる。**書き込みはしない**
4. v1 の Zod（`v1Schema.ts`）で検査（通らなければ、読めた分を `raw` に入れる）
5. `v1ToV2(v1Data, now)`（純粋関数）で `{ legacy, settingsPatch, hasLegacy }` を作る
6. v2 の1つの書き込みトランザクションで、`legacy`・`meta.settings`（テーマ）・`meta.migration = done` を書く
7. 旧記録があれば（下の条件）トーストを1回出す（「v1 の学習記録 ◯時間を『旧記録』に引き継ぎました」）

- 「旧記録あり」の条件: `logs` が1件以上、または `weeks` の `memo`・`repoUrl` のどれかが空でない、または `skills` に `checked: true` がある、または `badges` が1件以上。v1 は初回起動でロードマップ（`seed.ts`）を自動で入れるので、`months`・`steps`・`weeks` があるだけでは「あり」にしない。「なし」のときは旧記録のタブに「v1 の記録はありません」と出す
- 失敗したら `migration = { status: 'failed', error }` を書き、アプリは動かす。ホームの一番上に閉じられる帯「v1 の記録を読み込めませんでした ［v1 のデータを JSON で書き出す］ ［詳しく（設定）］」を出す（閉じたら、その起動の間は出さない）。設定画面には状態と理由、［v1 のデータから読み直す］［v1 のデータを JSON で書き出す］
- テーマの写し（localStorage の `java-study-tracker:theme`）はキーを変えずに使い続ける

#### v1 のデータを JSON で書き出す（F-DATA-4、`src/db/v1/v1Export.ts`）

- 目的: v2 を公開すると v1 の画面は無くなる。移行がうまくいかなくても、v1 の記録をファイルで持ち出せるようにする
- 手順
  1. `Dexie.exists('java-study-tracker')` が false なら、ボタンを押せなくし「このブラウザに v1 のデータはありません」と横に出す
  2. v1 の DB を移行と同じ方法で開き、全表を読むだけ（書かない）。すぐ閉じる
  3. v1 のエクスポートと同じ形にする: `{ app: 'java-study-tracker', schemaVersion: 1, exportedAt, data: { months, steps, weeks, skills, logs, badges, settings } }`（v1 の `createBackup` と同じ。`settings` は v1 の `settings` 表の `id: 'app'` の1件）
  4. **v1 の Zod は通さない**（壊れたデータでも持ち出せるように）。`JSON.stringify(…, null, 2)` で `java-study-tracker-v1-YYYY-MM-DD.json` として保存
- 読み込みでエラーになったら、エラーの文言を出す（「v1 の DB を開けませんでした: …」）
- 出したファイルは、v2 のインポート（`schemaVersion: 1`）でそのまま読める

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
  - `schemaVersion: 2` → Zod で検査 → 件数を見せて確認 → 全表を消して書く（1トランザクション）。ただし、ファイルの `legacy` が空なら、今の `legacy` と `meta.migration` は残す（開発サーバーの記録を本番に移すとき、本番で移した旧記録を消さないため。02-requirements.md N-DATA-4）
  - `schemaVersion: 1`（v1 のエクスポート、F-DATA-4 の書き出し）→ v1 の Zod → `v1ToV2` → `legacy` だけ上書き（今の進み具合は消さない）。Zod を通らなければ `raw` として入れる
  - 20MB を超えるファイル、`app` が違うものは読まない

---

## 4. Java 実行部分

### 4-1. 同梱するファイル

| 場所                                  | ファイル                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/java/teavm-javac/0.17.0-pg4/` | `compiler.wasm`（4.86MB）、`compiler.wasm-runtime.js`、`runtime-classlib-teavm.bin`（2.44MB）、`compile-classlib-teavm.bin`、`compiler.wasm-deobfuscator.wasm`、`SHA256SUMS`、`SOURCE.md`、`THIRD_PARTY_NOTICES.md` |
| `public/java/jq-shim/1/`              | `compile-classlib-teavm.jq.bin`（Scanner を足したもの。javac 用）、`shim-classes.bin`（TeaVM に渡す .class）、`SHA256SUMS`                                                                                          |

- ハッシュは research の付録の値と照合してから入れる（04-spikes.md で同じ配布物の一致を確認済み）。`SOURCE.md` に取得元 URL・取得日・teavm-javac のコミット・TeaVM 0.17.0・jdk25u のタグを書く
- `THIRD_PARTY_NOTICES.md` はこのフォルダに置き（01-decisions.md）、README とライセンス画面からリンクする
- 読み込み用 JS（`compiler.wasm-runtime.js`）は直さずに使う（CSP は `<meta>` なので `new Function` が動く。04-spikes.md 5章。11-4）
- 版はフォルダ名に入れる。更新したら新しいフォルダにし、Service Worker の古いキャッシュを消す（11章）

### 4-2. Worker の分け方

| Worker           | 寿命                                                | 役目                                                                                            | 時間切れ                                                                                              |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `compile.worker` | 常駐（1つ）。ホームの表示が終わってから起動（4-10） | ファイルの取得（進み具合つき）、`compiler.wasm` の読み込み、javac と TeaVM で `app.wasm` を作る | 15秒で応答がなければ作り直す                                                                          |
| `run.worker`     | 実行ごとに新規。終わったら捨てる                    | `app.wasm` を読み込んで `main` を呼ぶ。出力をまとめて送る                                       | 問題の `timeoutMs`（既定3000、1000〜10000）で `terminate()`。測り始めは `started` を受けたとき（4-4） |

- どちらも module Worker（`new Worker(new URL('./compile.worker.ts', import.meta.url), { type: 'module' })`）
- `compiler.wasm-runtime.js` は Vite で束ねず、`public/` の URL から動的 import（`import(/* @vite-ignore */ url)`）
- `.wasm` と `.bin` は `fetch` → `ArrayBuffer` で渡す（MIME に頼らない。research の推奨）
- コンパイルは毎回 `createCompiler()` で新しい Compiler を作る。classlib のバイト列は Worker の中で持ち回す
- コンパイラ内部の Wasm エラー（`RuntimeError` など）のときだけ、Worker を作り直して1回やり直す。学習者のコードのエラーではやり直さない
- 長く使ったときのメモリの増え方に備え、`compile.worker` は50回コンパイルするごとに作り直す（次のコンパイルの前に。17回続けて問題なかったのは確かめた。04-spikes.md 6章）
- コンパイル結果は覚えない（毎回コンパイルする。2回目以降でも中央値 0.5秒前後なので、覚える効果が小さい。04-spikes.md 6章）
- 時間の内訳（スパイク、Chrome、2回目以降）: javac 5〜50ms、TeaVM の Wasm 生成 350〜720ms、実行 10〜35ms

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
  | { type: 'started'; id: string } // main を呼ぶ直前。メインスレッドはここから時間切れを測る
  | { type: 'stdout'; id: string; text: string }
  | { type: 'stderr'; id: string; text: string } // 判定の行（5-4）も含む。分けるのはメインスレッド
  | { type: 'exit'; id: string; code: number } // teavm の onExit だけで送る。main() が戻っただけでは送らない（Thread.sleep などで途中で JS に戻ることがあるため）
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
  stepId: string; // 判定の行に入れる（5-4）
  rev: number;
  source: 'compact' | 'class';
  learnerFiles: SourceFile[]; // 編集できるファイル
  givenFiles: SourceFile[]; // 配る完成済みファイル
  testsJava: string | null; // Tests.java（中のクラス名は JqProblemTests。5-2）
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
  | { kind: 'precheck'; message: string } // 実行の前に止めた（4-5 の事前の検査）
  | { kind: 'unsupported' }
  | { kind: 'internal-error'; message: string };
```

- 実行中にもう一度「実行」が押されたら、前の `run.worker` を `terminate()` してから始める。コンパイル中のものは結果を捨てる（ID で見分ける）
- `judged` で合格になるのは「`done` があり、`total ≥ 1` で、`passed = total`」のときだけ（5-4）

### 4-4. 時間切れ・出力の上限

| 項目           | 値                                                                   | 動き                                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 実行の時間切れ | 問題の `timeoutMs`（既定3000、1000〜10000）                          | `started` を受けてから、メインスレッドのタイマーで `terminate()`（Wasm の読み込みは含めない）。それまでの出力（最後の200行）を出す。図鑑の `infinite-loop`                                                                                                        |
| コンパイル     | 15秒                                                                 | `compile.worker` を作り直し、「コンパイルが終わらなかった」。初回のダウンロードは別に数える                                                                                                                                                                       |
| 出力の上限     | 標準出力と標準エラー（判定の行を除く）の合計 10万文字 または 2,000行 | ハーネスの `JqCapture` が数え、超えたら `{"t":"limit"}` の判定の行を出して終える（ブラウザ・手元・CI で同じ動き。5-4）。`run.worker` も同じ上限で数え、超えたら `limit` を送る → メインスレッドが `terminate()`（念のための二重の守り）。図鑑の `too-much-output` |
| 送る間隔       | 50ms                                                                 | 1文字ずつ送らない（画面が固まるため）                                                                                                                                                                                                                             |

### 4-5. 外枠（コンパクトソースを包む）

- 理由: コンパクトソースのクラスは、別のファイルから名前で参照できない（実測: javac が「シンボルを見つけられません」）。判定のクラスから学習者のメソッドを呼ぶために、通常のクラスに包む
- 方法（`src/domain/java/wrap.ts`。手元用に同じものを `Check.java` にも Java で持つ）
  1. 1行目の先頭に `import module java.base; ` を足す（コンパクトソースが暗黙に持つ import と同じ。teavm-javac・JDK 25 の両方で動くことを実測）
  2. 学習者の最後の `import` 文の `;` の直後（無ければ 1. で足した文の直後）に、改行せず ` final class Main {` を足す
  3. 末尾に改行と `}` を足す
- 行番号は変わらない。列は「`import module java.base; ` を足した1行目」と「`final class Main {` を足した行」でずれる（import が無いときは1行目に両方入る）ので、エラーの表示で引く
- 最後の `import` 文は、コメント・文字列・テキストブロックを除いて探す（`wrap.ts` は 6-10 と同じ「コメントと文字列を消す」処理を使う）
- 包んだクラスは teavm-javac と JDK の両方で動くことを実測（`new Main().twice(5)` と `new Main().main()`。スパイクでも Chrome・WebKit で動いた）
- `source: class`（第4章以降）は包まない。`public class Main` のファイル名は `Main.java`
- 同じ入力と期待する出力の組を `java/test-vectors/wrap.json` に置き、Vitest と Java（CI）の両方で確かめる。「import なし」「import あり」「コメントの中の import」「テキストブロックの中の import」を必ず入れる

#### 事前の検査（`src/domain/java/precheck.ts`、F-RUN-8）

- `source: compact` の問題で、学習者のコード（コメントと文字列を除く）の一番外に `class` の宣言、または `static void main(String[]` があれば、包む前に止める（`RunResult` の `precheck`）
- 表示: 「この問題は `void main()` の形で書きます。`public class Main { ... }` の外側を外して、中身だけを書いてください」
- チャットからもらったコード（`public class Main`）を貼ったときに、意味の分からないコンパイルエラーを出さないため。質問文にも「`void main()` の形（コンパクトソース）で書いている」を入れる（10-1）

### 4-6. Scanner の代わり

- `java/shim/src/java.base/java/util/Scanner.java`・`InputMismatchException.java`（research で動いたものを元にする）
  - 対応: `next` `nextInt` `nextLong` `nextDouble` `nextBoolean` `nextLine` `hasNext` `hasNextInt` `hasNextLine` `close`。`new Scanner(System.in)` は渡されたストリームを無視し、`Scanner.setInput(String)` の内容を読む
  - `new Scanner(System.in)` は、**作った時点の入力**を持つ（あとで `setInput` されても変わらない）。JDK で `System.setIn` を差し替えても、作り済みの `Scanner` が古いストリームを読むのと同じ動きにするため（`static` な `Scanner` を書いたときに、ブラウザと手元で結果をそろえる）
  - JDK と同じ動きにすること: `nextInt` のあとの `nextLine` が空文字を返す、入力が尽きたら `NoSuchElementException`、`InputMismatchException` のあとは字句を消費しない
- 適合テスト（`java/test-vectors/scanner.json`、フェーズ2）: 入力と呼び出しの並び（`nextInt`→`nextLine` など）を約30組。JDK の本物と代わりのクラスで、戻り値と例外の型が一致することを CI（content ジョブ）で確かめる
- 作り方（`scripts/classlib-patch.ts`、JDK が必要）
  1. `javac --patch-module java.base=java/shim/src/java.base -d out` でコンパイル
  2. `compile-classlib-teavm.bin`（gzip。中は「名前の長さ2バイト・名前・データの長さ4バイト・データ」の並び）を展開し、.class を末尾に足して gzip し直す → `compile-classlib-teavm.jq.bin`
  3. 同じ .class を同じ並びの形で `shim-classes.bin` にする（compile.worker が `addClassFile()` で渡す）
- 再現の確認: CI で作り直し、**展開後のバイト列**が同梱のものと一致することを確かめる（gzip のヘッダーや圧縮の実装の違いで圧縮後は一致しないことがあるため）。JDK の版は `java/JDK_VERSION` に固定
- 入力の渡し方は `StdinBridge`（6-2）で、ブラウザと JDK の違いを1ファイルに閉じ込める（TeaVM には `System.setIn` が無い。実測）

### 4-7. エラーの整形

| 起きたこと                                                     | 画面の表示                                                                                                                                                                                                                                           | 図鑑              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| コンパイルエラー（学習者のファイル）                           | 「3行目 5文字目: `';' expected`」＋図鑑の日本語の説明。エディタの行に印。5件まで（最初の1件を強調）                                                                                                                                                  | 文言で判定（4-8） |
| コンパイルエラー（判定用のファイルで `cannot find symbol` 系） | 「判定用のコードが、あなたのコードの `canMove` を見つけられません。名前や引数を変えていませんか」（名前はエラーの文言から取る）。下書きの rev が古ければ「問題が新しくなりました」も出す                                                             | なし              |
| コンパイルエラー（クラスの重複）                               | 「`Pos` という名前は、この問題で配っているファイルと同じです。別の名前にしてください」（`Jq` で始まる名前は判定用に予約。5-2）                                                                                                                       | なし              |
| コンパイルエラー（判定用のファイル、上のどれでもない）         | 「判定用のコードでエラー。教材の不具合かもしれません」＋[問題を報告]                                                                                                                                                                                 | なし              |
| 実行時の例外（ケースの中）                                     | 「ArithmeticException（0 で割った）12行目」。行は取れたときだけ（WebKit では取れない。Chrome では取れる。04-spikes.md 1章）。メッセージが null のときは出さない。スタックトレースの `org.teavm.` で始まる行と、`Jq` で始まる判定用のクラスの行は消す | 例外の型で判定    |
| JS の `RangeError`                                             | 「StackOverflowError（再帰が深すぎる）」（Chrome・WebKit とも `name === 'RangeError'` で見分ける。スパイク）                                                                                                                                         | `stack-overflow`  |
| メモリ不足の Wasm エラー                                       | 「メモリが足りない（配列が大きすぎるかも）」                                                                                                                                                                                                         | なし              |
| 時間切れ                                                       | 「3秒たっても終わらなかった（無限ループかも）」＋途中までの出力                                                                                                                                                                                      | `infinite-loop`   |
| 出力の上限                                                     | 「出力が多すぎる（無限ループかも）」＋途中までの出力                                                                                                                                                                                                 | `too-much-output` |
| 学習者の `System.exit`                                         | 「途中で終了した（System.exit）」                                                                                                                                                                                                                    | なし              |
| コンパイラ内部のエラー                                         | 1回やり直す。だめなら「Java の実行環境でエラー。もう一度押すか、手元で実行」                                                                                                                                                                         | なし              |

- 英語の原文はそのまま出す（チャットで質問するときに使える）。説明が無いエラーは「質問文を作ると、チャットで日本語にできます」
- 説明の順番と見た目は 05-visual-design.md 7-7（何が起きた → よくある原因 → ［◯行目へ移動］ → 元のメッセージ）。「何が起きた」は `errors.yaml` の `summary` に行番号を付けたもの
- 結果の下の1行（F-RUN-7）: 学習者のコードに `prohibited.ts`（02-requirements.md 8-3 の正規表現。content-verify と同じもの）が当たったら「この書き方はブラウザと本物で結果が変わることがあります（HashMap の順番 など、当たった理由）。おかしいと思ったら手元で」。当たらなければ「手元の VS Code で動かしても、左と同じ文字が出ます。」

### 4-8. エラー図鑑の判定

- `content/errors.yaml` の各項目に、判定の条件を持たせる

```yaml
- id: semicolon-expected
  no: 1 # 図鑑の番号（表示は No.01。05-visual-design.md 7-7）。一度決めたら変えない
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

- 第3章以降で足す: `array-index`（`ArrayIndexOutOfBoundsException`）、`string-index`、`missing-return`（`missing return statement` / `return文が指定されていません`。実測）、`null-pointer`、`class-cast`（キャストの結果を使う書き方でだけ出る。02-requirements.md 8-3）、`stack-overflow`、`too-much-output`、`illegal-start`（`illegal start of expression` / `式の開始が不正です`。実測）、`bad-operand`（`bad operand types for binary operator`。05-visual-design.md のモックの例）
- teavm-javac の英語の文言が JDK と同じかは、`errors-fixtures` で CI が確かめる（同じ javac のはずだが未確認）

### 4-9. 対応ブラウザの判定

1. 起動時: `WebAssembly.validate()` に、GC の struct 型を1つだけ持つ最小のモジュールを渡す（バイト列はフェーズ1で Chrome で確かめて決める。WasmGC の無いブラウザで false になることは、Playwright で `WebAssembly.validate` を偽って確かめる）
2. 最初の準備のとき: `Hello` を実際にコンパイル・実行し、`hello` が出るか確かめる
3. どちらかが失敗 → `meta.java.support = 'unsupported'`。ステップ画面に案内（02-requirements.md N-BR-2: 「Chrome で開くか、『手元で実行』を使ってください」＋［URL をコピー］）。設定の「もう一度確かめる」でやり直せる

- 非対応のときの進め方: 書く問題では「実行」の代わりに「手元で実行」を主ボタンにする。`JqCheck.java` をコピー → 手元で `java JqCheck.java` → 出力を貼ると判定（5-6）。説明カードの「動かしてみる」と予想の「動かして確かめる」は隠す
- Chrome 以外のブラウザ（Safari 18.2 以上など）で動いたときは、そのまま使ってよい（確かめはしない）

### 4-10. 先読み

- ホームの表示が終わり、`requestIdleCallback`（無ければ 1.5秒後）で `JavaRunner.prepare()`
- 非対応と分かっていれば読まない
- `prepare()` は、Service Worker がページを管理するのを待ってから `compile.worker` を作り、取得を始める（`navigator.serviceWorker.controller` があるか、`controllerchange` を待つ。10秒たったら待たずに進む。開発サーバーと Service Worker の無い環境では待たない）。管理される前に取得すると、キャッシュに入らず、2回目までオフラインで動かないため（04-spikes.md 3章。11-1 の `clientsClaim` と組み合わせる）
- 読み込みの進み具合: 各ファイルの大きさは `public/java/manifest.json`（content-build が作る）から取る（gzip で配られると `Content-Length` が gzip 後の大きさになるため。GitHub Pages は `.wasm` を gzip で返す。04-spikes.md 7-1）

---

## 5. 判定（ハーネス）

### 5-1. 方針

- 判定は Java の側で行う。ブラウザ・手元・CI で**同じ Java のクラス**を使い、結果を決まった形の行（5-4）で出す
- TypeScript は、その行を読むだけ（比べ方を3か所に書かない）
- 例外: 予想問題の入力の比較（NFKC など）は TypeScript（Java のコードを動かさないため）

### 5-2. クラス

| ファイル                                | 役目                                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `java/harness/JqRun.java`               | 入口。`JqCases` の段階とケースを順に動かし、`JqProblemTests` を呼び、最後に `done` を出して `System.exit(0)`                                                                |
| `java/harness/JqTests.java`             | テストの基底クラス。`check`・`checkNear`・`checkOutput`・`checkThrows`                                                                                                      |
| `java/harness/JqCapture.java`           | `System.out`・`System.err` を横取りして、バッファと本当の出力の両方に書く（途中で止まっても出力が見えるように）。出力の上限（4-4）を数え、超えたら `limit` を出して終える   |
| `java/harness/JqProtocol.java`          | 判定の行を、本当の標準エラーに「改行 ＋ `\u001E@@jq ` ＋ JSON 1行 ＋ 改行」で書く（5-4）。JSON のエスケープもここ                                                           |
| `java/harness/JqText.java`              | 出力の正規化と比較、値の表示（文字列は `"..."`、配列は `Arrays.toString`、`null`）                                                                                          |
| `java/harness-browser/StdinBridge.java` | `java.util.Scanner.setInput(input)`（代わりの Scanner）                                                                                                                     |
| `java/harness-jdk/StdinBridge.java`     | `System.setIn(new ByteArrayInputStream(input.getBytes(UTF_8)))`                                                                                                             |
| 生成: `JqCases.java`                    | 段階・ケースの名前・入力・期待する出力を Java の文字列で持つ（TS か `Check.java` が作る）                                                                                   |
| 生成: `JqEntry.java`                    | 学習者の `main` の呼び方。`compact` → `new Main().main();`、`class` → `Main.main(new String[0]);`                                                                           |
| 教材: `Tests.java`                      | `final class JqProblemTests extends JqTests { void run(int stage) { ... } }`（ファイル名は教材では `Tests.java` のまま。組み立てるときに `JqProblemTests.java` として書く） |

- ハーネスは学習者向けの「使ってよい文法」の検査の対象外（ラムダなども使う）
- ハーネスの Java は、ブラウザで動かす問題と同じ禁止リストを守る（`getMessage` を表示しない など）
- `Jq` で始まるクラス名は判定用に予約する（学習者が `Tests` などのクラスを書いてもぶつからないように）。教材の問題文で学習者に作らせるクラス名に `Jq` を使わない（content-verify で検査）

### 5-3. 判定の2つの形

#### 出力の比較（`judge.mode: output`）

- ケースごとに入力（`stdin`）を渡し、`JqEntry.run()` の標準出力を期待する出力と比べる
- 正規化（`JqText.normalize`）: `\r\n` を `\n` に、各行の末尾の空白を消す、末尾の空行を消す。それ以外（全角・半角、行頭の空白）は区別する
- 失敗したら `expected` と `actual` を送り、画面で行ごとの差分を出す

#### テスト関数（`judge.mode: tests`）

```java
final class JqProblemTests extends JqTests {
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
- この出力を「出力」欄とタイルに出す。どの `mode` でも期待する出力を持たず、松明に数えない（`ok: null`）
- 絵の問題の目標（影）と、ホームの「できあがるとこうなる」は、最初の判定のケース（段階1・ケース1）の期待する出力（`expected/1.txt`）。教材は、そのケースの入力を `stdin`（そのまま実行の入力）と同じにする（content-verify で確かめる）

#### ケースと `static` の状態

- ケースは同じ実行の中で順に動く。コンパクトソース（第0〜3章）はケースごとに `new Main()` するので、フィールドは持ち越されない
- 第4章以降（`source: class`）は `static` なフィールドが前のケースの値を持ったまま次に入る。教材の決まり: `static` なフィールドや `static` な `Scanner` を使わせる問題は、判定のケースを1つにする（02-requirements.md 8-3）

### 5-4. 判定の行（プロトコル）

- 標準エラーに、1行ずつ `\u001E@@jq ` ＋ JSON。`\u001E`（レコード区切り）は学習者がまず出さない文字
- ハーネスは判定の行の**前に必ず改行を書く**（`"\n\u001E@@jq " + json + "\n"`）。学習者の出力が改行で終わっていなくても（`System.out.print("###")` で終わるなど）、判定の行が必ず行の頭から始まるようにするため。ターミナルでは標準出力と標準エラーが混ざるが、改行は標準エラー側に出るので同じ
- 読む側は、行の頭（`\u001E` があればその後ろ）が `@@jq ` の行を判定の行とする。手元で貼られた出力では `\u001E` が消えることがあるので、`@@jq ` だけでも受け付ける。画面に出す標準エラーからは、判定の行とその直前の改行1つを取り除く

```text
@@jq {"t":"hello","v":2,"step":"ch02.torch-row","rev":1,"source":"compact"}
@@jq {"t":"case","stage":0,"i":0,"name":"そのまま実行","ok":null,"actual":"#####\n#@..#\n"}
@@jq {"t":"case","stage":1,"i":1,"name":"高さ4","ok":false,"expected":"...","actual":"...","error":null}
@@jq {"t":"check","stage":1,"name":"canMove: 壁には入れない","ok":true}
@@jq {"t":"check","stage":1,"name":"平均","ok":false,"expected":"1.5","actual":"1.0"}
@@jq {"t":"case","stage":1,"i":2,"name":"高さ0","ok":false,"error":{"type":"java.lang.ArithmeticException","line":7}}
@@jq {"t":"stage","stage":1,"passed":3,"total":5}
@@jq {"t":"done","step":"ch02.torch-row","rev":1,"passed":3,"total":5}
```

- `hello` と `done` に問題 ID（`step`）と `rev` を入れる（`JqCases` に書き込む）。手元課題では `step` は課題の段階の ID（`p03.walls`）
- 合格は「`done` があり、`total ≥ 1` で、`passed = total`」。`total = 0` は合格にしない
- 貼られた出力（`where: 'local'`）の受け付け
  - `hello`・`done` の `step` が今の問題の ID と違う → 記録しない。「別の問題（ch02.xxx）の出力のようです。この問題の JqCheck.java で動かしてください」
  - `step` が同じで `rev` だけ違う → 記録する（`clearedRev` は貼られた `rev`）。「古い版の JqCheck.java の結果です」を1行出す
  - 悪意のある偽装は気にしない（利用者は本人1人）
- 出力の上限（4-4）を超えたら `{"t":"limit","reason":"output"}` を出して終える。`case` の `actual`・`expected` は 20KB で切り、「…（省略）」を付ける
- `error.line` は、スタックトレースのうち学習者のファイルの最初の行。取れなければ `null`（Chrome では取れ、WebKit では取れない。04-spikes.md 1章）
- `done` が来ないまま終わったら: `limit` があれば `output-limit`、終了コード ≠ 0 なら `crash`、0 なら `exited-early`
- 読む側（`src/domain/java/protocol.ts`）は、知らない `t` を無視する（後で増やせるように）
- 読み取りのテストデータ `java/test-vectors/protocol.json`: 改行なしの出力のあと、別の問題の出力、`total = 0`、`\u001E` なし、`limit`（14章）

### 5-5. 使う場所ごとの組み立て

| 場所                     | 作るファイル                                                                                                    | 動かし方                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ブラウザ                 | 包んだ `Main.java`、配るファイル、`JqProblemTests.java`、ハーネス（browser 版）、`JqCases.java`、`JqEntry.java` | compile.worker → run.worker（`mainClass: 'JqRun'`）                                                                                                                                                                                    |
| CI（content-verify）     | 同じ。JDK 側はハーネスの jdk 版                                                                                 | JDK: `javac -d` → `java -cp`。teavm: Node の別プロセス（問題ごと）                                                                                                                                                                     |
| 手元の小問（F-STEP-10）  | 1ファイル `JqCheck.java`（5-6）                                                                                 | `java JqCheck.java`                                                                                                                                                                                                                    |
| 手元課題（`Check.java`） | 一時フォルダに、学習者のファイル（包む）・ハーネス（jdk 版）・`JqCases`・`JqProblemTests` を書く                | `Check.java` が同じ `java` を子プロセスで起動（`ProcessHandle.current().info().command()`）。標準出力と標準エラーはファイルに出し（`redirectOutput`・`redirectError`）、終わってから読む（管が詰まって止まらないように）。20秒で止める |

- `JqCases.java` は TypeScript（ブラウザ・CI）と `Check.java`（手元課題）の2か所で作る。日本語・改行・`"`・`\`・タブを含むケースを `java/test-vectors/cases.json` に置き、両方で同じ文字列になることを確かめる

### 5-6. 手元で実行する1ファイル（`JqCheck.java`）

- 1ファイルにまとめる理由: コピーして貼るだけで動かせる（ブラウザで動かないときの唯一の代わり。01-decisions.md）
- 決まり: **コードはアプリで書く。手元は判定するだけ**。手元で直したら、エディタに貼り戻してもらう（画面の「手元で実行」の説明に書く）。質問文・図鑑・作品は、アプリのエディタの中身を使う
- 中身の順番（学習者のコードの行番号が、いつも「+2」になるように並べる）
  1. 1行目: `import module java.base;`（`compact` のとき）と、学習者の `import` 文を1行にまとめたもの
  2. 2行目: `class JqCheck { public static void main(String[] a) { JqRun.main(a); } }`（JDK の「ソースファイルのまま実行」は、ファイルの最初のクラスを動かす）
  3. 3行目から: 学習者のコード。`import` 文は同じ長さの空白に置き換え、行の数を変えない。`compact` は3行目の頭に `final class Main { `（改行なし）を、最後に改行と `}` を足して包む
  4. そのあと: 配るファイル、`JqProblemTests`、ハーネス、`JqCases`、`JqEntry`（すべて `public` を外す）
- `public class Main` が `JqCheck.java` の中にあっても、ソースファイルのまま実行するときは JDK がファイル名を問わない（JEP 330）。`compact`・`class` の両方の形が動くことを確かめた（04-spikes.md 7-2）
- 出力を貼ると、5-4 の行を読んで判定結果として記録する（`where: 'local'`。問題 ID が違えば記録しない）
- コンパイルエラーのときは判定の行が出ず、JDK の `JqCheck.java:<行>: error: <文言>`（日本語の JDK は `エラー:`）だけが出る。これを読み、行から 2 を引いて自分のコードの行として出す。図鑑の判定は日本語・英語の両方の文言で行う。コンパイルエラーには問題 ID が入らないので、表示と図鑑の「発見」だけにし、合否は記録しない

---

## 6. 教材の形式とスクリプト

### 6-1. フォルダ

```
content/ch02/torch-row/
  problem.md          # 前書き（YAML）＋本文
  Starter.java        # ひな形（学習者が最初に見る。画面では Main.java）
  Solution.java       # 模範解答（ビルドに入れない）
  Tests.java          # テスト関数（judge.mode が tests・both のとき。中のクラス名は JqProblemTests）
  expected/1.txt      # ケース1の期待する出力（JDK の出力から作る。手で書かない）
  wrong/OffByOne.java # よくある間違い（2つ以上。修理問題は1つ以上）。1行目に期待する落ち方（下記）
  alt/Loop.java       # 別解（任意）。全部の松明がともることを確かめる
  given/Pos.java      # 配る完成済みファイル（読み取り専用のタブで見せる。任意）
```

- `wrong/*.java` の1行目は、期待する落ち方の宣言（無ければ content-verify は失敗）
  - `// expect: test` … コンパイルが通り、最後（`done`）まで動き、値か出力の不一致で少なくとも1つ失敗する
  - `// expect: exception java.lang.ArithmeticException` … コンパイルが通り、その型の例外で少なくとも1つ失敗する
  - `// expect: compile semicolon-expected` … コンパイルエラーになる（図鑑の ID は任意。書けば、その判定に当たることも確かめる）
  - `// expect: timeout` … 時間切れになる
  - 宣言と違う落ち方（たとえば `test` のつもりが打ち間違いでコンパイルエラー）なら、検証は失敗。1行目の宣言は、検証の前に取り除く
- Starter の期待する落ち方は、前書きの `expectError`（6-2）。書いていなければ `test`（コンパイルが通り、テストで落ちる）。修理（`fix`）は `expectError` が必須
- Starter のエディタ用の印（任意。F-STEP-15、05-visual-design.md 7-4）: content-build が取り除き、行番号に直して JSON に入れる
  - 行の末尾の `//@write` … 「書くのはここ」の行
  - `//@fold 迷路を char[][] にして歩く` の行から `//@end` の行まで … 折りたたむ範囲と、その説明（1行）。折りたたみはこの範囲で行い、CodeMirror の構文木には頼らない（コンパクトソースで構文木が崩れるため。04-spikes.md 4章）

| 種類（`type`）                  | 必要なファイル                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `card`                          | `problem.md`、任意で `Example.java`（`expected/0.txt` を作る）                                                                                   |
| `predict`                       | `problem.md`、`Program.java`（読むだけのコード）、`expected/0.txt`                                                                               |
| `quiz`                          | `problem.md` だけ                                                                                                                                |
| `fill` `fix` `implement` `draw` | `problem.md`、`Starter.java`、`Solution.java`、`wrong/*.java`、出力の比較なら `expected/*.txt`、テスト関数なら `Tests.java`。任意で `alt/*.java` |
| `parsons`（後続）               | `problem.md`、`Solution.java`（行の並びの元）、`distractors.txt`（ダミーの行）                                                                   |

- 問題のフォルダ名（slug）は英小文字・数字・`-`。ID は `ch<2桁>.<slug>`。並び順は前書きの `order`（10刻み）

### 6-2. `problem.md` の前書き（完全なスキーマ）

```yaml
id: ch02.torch-row # 必須。/^ch\d{2}\.[a-z0-9-]+$/。フォルダと一致。一度決めたら変えない
rev: 1 # 必須。1以上の整数。中身を大きく変えたら上げる（クリアの記録は残る）
type: draw # 必須。card | predict | quiz | fill | fix | implement | draw | parsons
title: 松明を並べる # 必須。20文字まで
chapter: 2 # 必須。0〜9。フォルダの章と一致
part: 3 # 必須。部品の番号（course.yaml の parts の n）。画面では「部品 2-3」
order: 50 # 必須。章の中の並び。重複不可
concepts: [for, modulo] # 必須（card・quiz は任意）。concepts.yaml の ID
minutes: 3 # 必須。1〜3（作り手の見積もり）。収まらない実装問題は2ステップに分ける。手元課題は project.md 側
goal: 上の壁に松明が並ぶ # 任意。ホームの「できあがるとこうなる」の1行（20文字まで）
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
expectError: # fix で必須（ほかは任意。無ければ test）。ひな形のままだと何が起きるか
  kind: compile # compile | exception | test | timeout
  dex: semicolon-expected # compile・exception のとき必須。errors.yaml の ID
  type: java.lang.ArithmeticException # exception のとき必須。例外の完全な型名
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
- 章を移すと ID（`ch02.…`）も変わり、記録が切れる。公開済みの問題は章をまたいで動かさない（必要なら新しい ID で作り、古いものは公開から外す。6-8 の `ids.lock` で、消したことが分かる）

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

| ファイル         | 画面に出すか                                     | ビルドの出力に入れるか | 検証                                                                                        |
| ---------------- | ------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------- |
| `Starter.java`   | 出す（エディタの初期値、ファイル名 `Main.java`） | 入れる                 | `expectError` の落ち方で落ちる（無ければ `test`: コンパイルが通り、テストで落ちる）（両方） |
| `Solution.java`  | **出さない**                                     | **入れない**           | 全部の松明がともる（JDK・teavm の両方）。`total ≥ 1`                                        |
| `wrong/*.java`   | 出さない                                         | 入れない               | それぞれ、1行目に宣言した落ち方で落ちる（両方。6-1）                                        |
| `alt/*.java`     | 出さない                                         | 入れない               | 全部の松明がともる（両方）。テストが模範解答に寄りすぎていないか                            |
| `expected/*.txt` | 目標の絵・差分として出す                         | 入れる                 | JDK の出力と一致。`--update` で作り直す                                                     |
| `Tests.java`     | 出さない（失敗したテストの名前と値は出す）       | 入れる                 | ハーネスと一緒にコンパイルできる                                                            |
| `given/*.java`   | 読み取り専用のタブで出す                         | 入れる                 | 使ってよい文法の検査は警告だけ（落とさない。6-10）                                          |

- 模範解答はリポジトリには入る（公開リポジトリ）。うっかり見ないための決まり: 教材のプルリクエストの説明やエージェントの返答に中身を書かない（「第2章 12問追加、CI 全通過」程度）

### 6-5. `course.yaml`・`concepts.yaml`・`gifts.yaml`

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
    parts: # 部品（2〜4ステップのまとまり。01-decisions.md の「C の部品をステップに分ける」）
      - { n: 1, title: ダンジョンの入口 }
      - { n: 2, title: 壁を1行 }
    allow:
      keywords: [void]
      apis: [System.out.println, System.out.print]
    project: p00 # 第0章だけ、この課題をコースの並びの最後に入れる（9-1）
  # ... ch01〜ch09
```

- 部品の中のステップの並びは `order` の順。画面の「ステップ 2 / 3」は部品の中の何番目か
- 部品は表示のまとまりだけ。判定・点・記録には使わない（ID にも入れない）

```yaml
# content/concepts.yaml（技カード）
- id: for
  name: for 文
  chapter: 2
  oneLine: 決まった回数くりかえす
```

```yaml
# content/gifts.yaml（宝箱のおみやげ。タイルの見た目の替えだけ。並んだ順に1つずつ渡す）
- id: floor-moss
  name: 苔の石畳
  tile: floor # 替えるタイル（8-2 の名前）
  sprite: floor-moss # sprites.svg の symbol
- id: wall-brick
  name: 赤れんがの壁
  tile: wall
  sprite: wall-brick
```

- MVP は3つ程度。数は画面に出さない。残りを「?」で見せない（集めるものは技カードとエラー図鑑の2つだけ。01-decisions.md）

### 6-6. 手元課題の形式

```
content/projects/p03/
  project.md            # 前書き＋段階ごとの本文
  starter/Maze.java     # 作業フォルダに入るひな形
  solution/Maze.java    # 模範解答（zip にもビルドにも入れない）
  given/                # 配る完成済みファイル（任意）
  Tests.java            # 段階ごとのテスト（run(int stage) の中で分ける。stage は n）
  expected/walls-1.txt  # 段階 walls・ケース1の期待する出力（JDK から作る）
  wrong/walls/*.java    # 段階 walls で落ちるべき間違い（任意。1行目に期待する落ち方。6-1）
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
  - id: load # 段階の ID（slug）。記録は 'p03.load'。一度決めたら変えない
    n: 1 # 表示の順番。途中に段階を足すときは n を振り直してよい
    title: マップを読み込んで描く
    minutes: 20 # 15〜25
    mode: output # output | tests | both
    cases:
      - { name: 小さなマップ, stdin: '' }
  - id: walk
    n: 2
    title: 移動の文字列で歩く
    minutes: 20
    mode: both
    cases:
      - { name: 壁にぶつかる, stdin: "RRRR\n" }
reviewed: false
```

- 本文の見出し: `## 段階1`、`## 段階1 ヒント1`〜`3`、… 、`## まとめ`
- `p00`（手元の準備）は段階1つ。`Hello.java` を動かすだけ。第0章のコースの並びの最後に入る（9-1）
- `p09`（Spring Boot）は `source: spring`、10段階前後（1段階25分以内）。`Check.java` は使わず、Maven Wrapper の `./mvnw test` の結果を見て段階ごとのクリアコードを出す小さなテストクラスを配る（形は第9章を作るときに決める）
- 手元課題の段階の数: p00 が1、p01〜p08 が各3、p09 が10 → 合計35

### 6-7. `Check.java` とクリアコード

#### `Check.java`（workspace-build が章ごとに作る）

- 置き場所: `java-quest/chNN/Check.java`。ハーネスは `java-quest/chNN/.jq/` に入れる
- `Check.java` は workspace-build（TypeScript）が文字列から作る。JDK は使わない（12-3）
- 動き
  1. 自分の版（教材の版・課題の rev）を表示
  2. 一時フォルダに学習者のファイル（`compact` は 4-5 の方法で包む。Java で同じ処理）、`.jq/` のハーネス（jdk 版）、`JqCases.java`（`Check.java` の中の文字列から書き出す）、`JqProblemTests.java` を書く
  3. `java JqRun.java` を子プロセスで起動（20秒で止める）。標準出力と標準エラーはファイルに出し、終わってから読む（5-5）。標準エラーの `@@jq` の行を読む
  4. 人が読める結果と、クリアコードを表示
- 出力の形（アプリが貼られたものを読むので固定）

```text
JQ-CHECK 2 p03 rev1 content 2026.12.01-1
[1/3] マップを読み込んで描く ........ PASS
[2/3] 移動の文字列で歩く ............ FAIL
      ケース「壁にぶつかる」
      期待: #@..#
      実際: #..@#
[3/3] ゴール判定と歩数 .............. FAIL
クリアコード: JQ1-p03-1/3-K7QF
```

- コンパイルエラーのとき（判定の行が出ない）: エラーを学習者のファイル名と行で1行ずつ出す（包んでも行番号は変わらない。4-5）。`JQ-COMPILE Maze.java:12: ';' expected` の形（文言は JDK のまま。日本語の JDK なら日本語）。アプリはこの行で図鑑の判定と行の表示をする
- `passed` は「段階1から続けて通った数」（上の例では1）。0 のときは `クリアコード: なし`
- アプリでの受け付け: 1行目の `JQ-CHECK` の課題 ID が、開いている課題と違えば記録しない（「別の課題（p02）の結果のようです」）。クリアコードだけを貼ったときも、コードの中の課題 ID で同じく確かめる
- 失敗時の質問文の下書き `.jq-ask.md`（F-PROJ-5）は MVP では作らない（後続 12）。手元課題の画面の「質問文を作る」で、貼った出力から作る

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
- `mvnw` には外部属性で実行権限（0755）を付ける。macOS の展開で権限が残るかは未確認なので、手順には `sh mvnw spring-boot:run` でも動くと書く

### 6-8. content-build（`npm run content:build`）

- JDK 不要（workspace-build も同じ。12-3）。`npm run build`・`dev`・`typecheck`・`test` の前に自動で動く（npm の `pre*`。2秒以内を目標）
- 入力: `content/`。出力: `src/content/generated/`（git に入れない）、`public/java/manifest.json`
- 手順
  1. `course.yaml`・`concepts.yaml`・`errors.yaml`・`gifts.yaml` を読み、Zod で検査
  2. 各問題・各手元課題のフォルダを読み、前書き（`yaml` で解析）と本文（見出しで分割）を Zod で検査
  3. 参照の検査: ID の重複、章とフォルダの一致、`order` の重複、`part` が `course.yaml` にあるか、`concepts`・`dex` の参照先、種類ごとの必要なファイル、`wrong/*.java` の1行目の宣言（6-1）
  4. `ids.lock` の検査（下記）
  5. Starter の印（`//@write`・`//@fold`・`//@end`。6-1）を取り除き、行番号にする
  6. `reviewed: false` のものを外す（`--all` を付けると含める。開発用）
  7. 出力
     - `course.json`: 章・部品・ステップの並び（ID・題・種類・目安・おかわり）・技カード・エラー図鑑・おみやげ・教材の版
     - `chNN.json`: その章のステップの中身（本文、Starter、given、Tests、ケースと期待する出力、`Program.java`、選択肢）。**Solution と wrong は入れない**
     - `projects.json`: 手元課題の段階・本文・ケース
  8. 画面は `course.json` を最初に読み、`chNN.json` は開くときに動的 import（Vite がハッシュ付きの別ファイルにする）
- エラーはファイルの場所と項目名を全部まとめて出し、終了コード 1

#### `content/ids.lock`（公開済みの ID を守る。F-CONTENT-5）

- 中身: 公開済み（`reviewed: true`）の問題・手元課題の段階・技カード・エラー図鑑・おみやげの ID ごとに、`rev` と「判定に関わる中身のハッシュ」（Starter・Tests・given・ケース・`expected`・`judge` の SHA-256 の先頭12文字）。1行1件のテキスト
- content-build が落とすもの（JDK 不要なので `check` ジョブで分かる）
  - `ids.lock` にある ID が無くなった（消すときは `ids.lock` から手で消し、理由をコミットに書く）
  - ハッシュが変わったのに `rev` が上がっていない（文の直しだけならハッシュは変わらない）→「rev を上げて `content:lock`」
  - `rev` やハッシュが `ids.lock` と違う、または公開済みなのに `ids.lock` に無い →「`content:lock` を実行」（ids.lock がいつも今の中身と一致するように）
- 更新: `npm run content:lock` で書き直す（新しい ID の追加と、rev を上げたものの更新だけ。rev が同じでハッシュだけ違うものは書き直さない）
- 章を移すための別名（`aliases`）は持たない（6-2。移さない決まりで足りる）

### 6-9. content-verify（`npm run content:verify`）

- JDK 25 と Node が必要。CI では専用のジョブ（11章）
- 使い方: `npm run content:verify -- [--only ch02 | --only ch02.torch-row] [--update] [--jobs 4] [--no-teavm] [--no-cache]`
- 実行の仕組み
  - JDK: 一時フォルダに 5-5 のファイルを書き、`javac -encoding UTF-8 -d out` → `java -cp out JqRun`。日本語の文言の確認は `-J-Duser.language=ja -J-Duser.country=JP`
  - teavm-javac: Node の別プロセス（`scripts/lib/teavm-run.ts`）で1問ずつ。理由: Node で同じ compiler.wasm を何度も使うと落ちることがある（research）。コンパイラ内部のエラーは1回だけやり直す
  - 並列: 既定は CPU 数 − 1（最大4）
  - キャッシュ: 問題フォルダの全ファイル・ハーネス・teavm の版・JDK の版・検証スクリプトの版の SHA-256 をキーに、通った結果を `.cache/content-verify/` に置く。CI では `actions/cache` で持ち越す
  - 1回の実行の上限: JDK・teavm とも10秒（落ち方の宣言が `timeout` のものは、問題の `timeoutMs` で止めて時間切れを確かめる）
- 確かめること

| 対象            | 確かめること                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| すべて          | content-build と同じスキーマ・参照の検査                                                                                                                                                                                             |
| Java を含むもの | 使ってよい文法（6-10）、ブラウザで使わない書き方（`runtime: browser` のとき。02-requirements.md 8-3。正規表現は `src/domain/java/prohibited.ts`）、学習者に作らせるクラスの名前が `Jq` で始まらない                                  |
| Solution        | JDK と teavm の両方で、全部の松明がともる（`total ≥ 1`）。ケースごとの出力が JDK と teavm で完全に一致                                                                                                                               |
| Solution        | JDK で2回動かして出力が同じ（毎回同じ結果）                                                                                                                                                                                          |
| Solution        | teavm（Node）での実行時間（コンパイルを除く）が、問題の `timeoutMs` の 1/3 以下（遅い PC でも画面で時間切れにならないように）                                                                                                        |
| alt/*.java      | 両方で全部の松明がともる                                                                                                                                                                                                             |
| expected/*.txt  | JDK の出力と一致（`--update` で書き直す。teavm と違うときは書き直さずに落とす）                                                                                                                                                      |
| 出力            | `Hero@1b6d3586` のような既定の `toString` に見える文字列（`/\b[A-Z]\w*@[0-9a-f]{5,}\b/`）を含まない                                                                                                                                  |
| Starter         | `expectError` の落ち方（無ければ `test`）で落ちる（両方）。落ち方の判定は下の表                                                                                                                                                      |
| wrong/*.java    | それぞれ、1行目に宣言した落ち方で落ちる（両方）。宣言と違う落ち方なら失敗                                                                                                                                                            |
| draw            | 最初の判定のケースの入力が `stdin`（そのまま実行の入力）と同じ（目標の絵とそのまま実行の出力を比べられるように。5-3）                                                                                                                |
| predict         | `Program.java` を両方で動かして一致。`expected/0.txt` と一致。`choice` なら正解がちょうど1つで、ほかは違う                                                                                                                           |
| card の Example | 両方で動き、一致                                                                                                                                                                                                                     |
| draw            | 期待する出力が 80桁×40行に収まる                                                                                                                                                                                                     |
| quiz            | `answer` が選択肢の範囲内（中身の正しさはレビュー担当が見る）                                                                                                                                                                        |
| errors.yaml     | `fixture: true` の項目は、`errors-fixtures/<id>.java` が javac（英・日）・teavm で判定に当たる。runtime は例外の型が両方で一致                                                                                                       |
| 手元課題        | 作業フォルダを組み立て、`solution/` を入れて `java Check.java` → 全段階 PASS と正しいクリアコード。`starter/` のままでは段階1が FAIL                                                                                                 |
| ハーネス        | `test-vectors/wrap.json`・`clear-code.json`・`cases.json`・`protocol.json` を Java で確かめる                                                                                                                                        |
| Scanner         | `test-vectors/scanner.json`（約30組）: JDK の本物の `Scanner` と代わりのクラスで、戻り値と例外の型が一致（4-6）                                                                                                                      |
| double          | `test-vectors/double.json`（`0.1+0.2`、`1.0/3`、`100.0/7`、`1e7`、`1e-4`、`(double) 1/3*3` など約100値）: `println` の結果が JDK と teavm で一致。違えば 02-requirements.md 8-3 に `printf` の決まりを足し、その正規表現も検査に足す |
| classlib        | `classlib-patch.ts --check`: 作り直した展開後のバイト列が同梱のものと一致                                                                                                                                                            |

- 落ち方の判定（Starter・wrong。JDK と teavm の両方で同じであること）

| 宣言                  | 合う条件                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `test`                | コンパイルが通る。`done` まで動く。`total ≥ 1`、`passed < total`。失敗のうち少なくとも1つは `error` が無い（値・出力の不一致） |
| `exception <型>`      | コンパイルが通る。ケースかテストの失敗、または捕まえない例外のうち、少なくとも1つの型が `<型>`                                 |
| `compile [<図鑑 ID>]` | コンパイルエラー。図鑑 ID があれば、javac（英・日）と teavm の文言がその判定に当たる                                           |
| `timeout`             | 時間切れ（`timeoutMs`）                                                                                                        |

- 出力: 問題ごとに `OK` / `NG（理由）`、最後に合計。NG が1つでもあれば終了コード 1
- `tests/content-fixtures/` にわざと壊した教材を置き、content-verify が正しく落とすことを Vitest（JDK がある環境だけ）で確かめる。壊し方に「`test` と宣言した wrong がコンパイルエラーになる」「Starter がコンパイルできない」「Solution の `total` が 0」を入れる

### 6-10. 「使ってよい文法」の検査（簡易）

- 対象: Starter・Solution・Program・Example・手元課題の starter/solution。加えて、`problem.md` の本文（ヒント・解説を含む）の ```java のコードブロックも同じ検査にかける
- `given/*.java` は検査するが、当たっても落とさず警告だけ出す（読み取り専用のタブで学習者に見えるので、レビュー担当が「見せてよいか」を判断する）
- 方法（`scripts/lib/allowlist.ts`）
  1. コメントと文字列リテラルを消す
  2. 取り出すもの: Java のキーワード、`Type.method(`（static）、`.method(`（インスタンス）、`new Type`、型として使われた大文字始まりの名前、`->`（`case` の後ろ以外はラムダ）、`::`、配列の `[`、型引数の `<`
  3. 許すもの: 第0〜N章の `allow` の合計、`allowExtra`、そのファイルと given で宣言された名前（クラス・メソッド・フィールド）
  4. インスタンスのメソッドは名前だけで照合する（どの型のものかは見ない。簡易のため）
- 誤判定があれば `allowExtra` で理由を書いて通す。検査の精度を上げるより、レビューで補う

### 6-11. 公開までの流れ（教材）

1. 作成エージェントがフォルダを作る（`reviewed: false`）
2. `npm run content:verify -- --only <id> --update` で期待する出力を作る → 差分を見る
3. 別のレビュー用エージェントがチェックリストで確かめる: **模範解答を見る前に、問題文だけから期待する出力を自分で書き、`expected` と比べる（予想問題は必須）**／問題文だけで解けるか／ヒント3が答えそのものでないか／解説が出力と矛盾しないか／まだ習っていない用語がないか／1〜3分で終わる大きさか／`given` の警告（6-10）を見せてよいか
4. `reviewed: true` にして `npm run content:lock`、コミット。CI の content ジョブが通れば公開される
5. 公開済みのものを直したとき: 判定に関わる中身を変えたら `rev` を上げる（6-8）。コミットの前に 3. のレビューをやり直す（`reviewed` は `true` のまま。`false` に戻すと公開から外れ、`ids.lock` の検査で落ちるため）

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
- 描き方: CSS グリッド（`<div role="img">`）。1マス 24px（設定で 16／24／32。05-visual-design.md 6-1 のとおりドットの整数倍だけ）。キャンバスは使わない（テストしやすさと、文字の選択のため）
- タイルの面は常に暗い背景（`well`。テーマに関係なく。05-visual-design.md 4-1）
- 「タイル／文字」の切り替え。「タイル」の表示は、左に出力の文字、右にタイルを同じ行の高さで並べる（行注釈。05-visual-design.md 6-1）。文字の表示は等幅の `<pre>`（読み上げとコピーに使う）
- 絵の問題では、目標（`expected/1.txt`。5-3）を薄く（不透明度 35%）並べて出す（影）。エラーのときも消さない

### 8-2. 文字とタイルの対応

- 色と 8×8 ドットの形は 05-visual-design.md 6-2 が正本（前の版のこの表の色の列は置き換えた）。ここは文字とタイルの名前の対応だけ

| 文字        | タイル（名前）         |
| ----------- | ---------------------- |
| ` `（空白） | 闇 `void`              |
| `.`         | 床 `floor`             |
| `#`         | 壁 `wall`              |
| `+`         | 扉 `door`              |
| `@`         | 勇者 `hero`            |
| `>`         | 下り階段 `stairs-down` |
| `<`         | 上り階段 `stairs-up`   |
| `*`         | 松明 `torch`           |
| `$`         | 金貨 `gold`            |
| `!`         | 薬 `potion`            |
| `&`         | 宝箱 `chest`           |
| `~`         | 水 `water`             |
| `^`         | 罠 `trap`              |
| `%`         | 草 `grass`             |
| `\|`        | 柱 `pillar`            |
| `=`         | バー（満） `bar-full`  |
| `-`         | バー（空） `bar-empty` |
| `[` `]`     | バーの端 `bar-cap`     |
| `0`〜`9`    | 数字 `digit`           |
| そのほか    | 文字 `glyph`           |

- 英大文字は既定では「文字」。問題の `tiles` で魔物（`slime` `bat` `skeleton` `chaser` `ghost` `dragon` `npc`）に割り当てられる（後続 F-TILE-2）
- 形は SVG のスプライト1枚（`src/components/tiles/sprites.svg`）に `<symbol>` で入れ、`<use>` で描く。絵は矩形だけ（critic-tech: イラスト中心にしない）。80×40 で 3,200 マスになるので、描画の速さを開発中に一度測る
- おみやげ（`gifts.yaml`）を使っているタイルは、`meta.settings.skins` の symbol で描く（9-5）
- 色は `src/domain/tiles/tileTable.ts` にまとめる。図と地のコントラストは 3:1 以上（WCAG の非テキストの基準。床と闇の例外は 05-visual-design.md 6-2）を Vitest で確かめる
- アクセシビリティ: 格子全体に `aria-label`（例:「タイル 12×5。勇者1、松明3、壁20」）。各マスは読み上げない。文字の表示に切り替えられる
- 色・アニメーション（コマ送り）は後続。行の頭が `@@jq ` の行（判定の行と同じ印）で指示する形を予定（F-TILE-3）

---

## 9. ルール（計算式）

### 9-1. 次のステップの選び方（`domain/progress/nextStep.ts`）

- 入力: コースの並び（公開済みのステップ。第0章の最後に p00 の段階を含む）、`progress`、近道ルートか
- 宝箱と解き直しは「次の1ステップ」とは別に、ホームのカードの上の帯に出す（9-5）。次の1ステップを隠さない
- 決め方（上から順に、最初に当てはまったもの）
  1. 書きかけ: 状態が `trying` のステップのうち、`lastOpenedAt` が一番新しいもの。ただし、そのあとに別のステップをクリアしていれば対象にしない（自分で先に進んだら、置いてきたものを追いかけない）
  2. 先へ: 最後にクリアしたステップのコース上の次から順に見て、最初の `cleared` でないステップ（近道ルートなら `optional` を飛ばす）。最後まで無ければ、コースの頭から同じく探す
  3. 全部終わった → F-HOME-6 の表示
- `trying` になるのは、コードを変えたか、実行したか、答えたとき（開いてのぞいただけでは `new` のまま。地図からのぞいても「次」が動かないように）
- 飛ばしたステップは地図に「未」で残る。解き直したくなったら地図から開く
- 持ち時間（F-HOME-3。05-visual-design.md 7-3 の3つのボタン）
  - 5分・15分: 上の結果と同じ（ステップは1〜3分なので、どちらも「次の1ステップ」でよい。15分は「つづける」で次々に進む）
  - 30分以上: 今の章か前の章の手元課題に、未クリアの段階があればその最初の段階。無ければ上の結果
- 手元課題の段階はコースの並びに入れない（20分の課題が「次の1ステップ」に来て、壁1に戻らないように）。例外は p00（手元の準備、約10分）で、第0章の最後に入れる（02-requirements.md 4-1 の 7）。章の小問を全部終えると、ホームの手元課題の枠を目立たせる
- 目安時間の表示: `round(minutes × k)` 分（`k` は 9-7 の実際の倍率。クリア済みが10ステップ未満なら `minutes` のまま）

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
  - L2 = 10点（小問3〜4問）、L3 = 22、L5 = 48、L10 = 130、L20 = 370、L30 = 710
  - 本線の合計は約715点（カード37×1・予想とクイズ35×2・穴埋めと修理42×3・実装と絵33×4・手元課題の段階35×10）→ 全部終えると Lv 30 前後
- 今のレベル = `T(L) ≤ 合計点` となる最大の L
- 次までの残りは「ステップ」の数で出す（05-visual-design.md 7-9「次まで 4 ステップ」）: 9-1 の「先へ」の順に未クリアのステップの点を足していき、`T(L+1) − 合計点` に届くまでの数（手元課題の段階は数えない）。届かない（教材が足りない）ときは「次まで ◯点」
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

- 起動時の順番（`domain/progress/welcome.ts`）
  1. 空いた日数 `gap = 今日 − meta.app.lastActiveAt の日` を計算する（日単位。端末の時刻）
  2. `gap ≥ 7` で、`meta.welcome.pendingChest` が空なら、宝箱を置く: `pendingChest = { gapDays: gap, grade }`、`pendingReview = true`
  3. そのあとで `meta.app.lastActiveAt` を今にする（先に更新すると gap が0になり、宝箱が出ないため）
- 宝箱は、開けるまで `meta.welcome.pendingChest` に残る（「宝箱はあとで開ける」で閉じても、次の起動で消えない）。1回の「おかえり」で1つ。開けたら `chests` に1行書き、`pendingChest = null`

| 空いた日数 | 宝箱（見た目だけ） |
| ---------- | ------------------ |
| 7〜13      | 木                 |
| 14〜27     | 銀                 |
| 28 以上    | 金                 |

- 中身（05-visual-design.md 7-8）: 易しい解き直し1問と、おみやげ1つ
- おみやげ: `gifts.yaml` の並びのうち、まだもらっていない最初のもの（等級に関係なく1つ）。もらったら、そのタイルの見た目を自動で替える（`meta.settings.skins`）。設定でいつでも戻せる。全部もらったあとは、おみやげのカードを出さない（「空っぽ」とも言わない）
- 数を数えない・残りを「?」で見せない（集めるものは技カードとエラー図鑑の2つだけ）
- 点やレベルは増えない（レベルは「できたこと」だけ。01-decisions.md）
- 易しい解き直し: クリア済みの `easy: true` のステップのうち、最後にクリアした章のもの（無ければ直近にクリアした予想問題）。下書きは使わず、ひな形から。結果は `attempts` に残すが、点は付けない（後続の F-REV-1 では1点）
  - モーダルの「1問だけやる」で開く。終わるか、ステップ画面の「飛ばす」を押したら `pendingReview = false`。モーダルを閉じただけなら残す（次に宝箱の帯から開ける）
- 「休む」にした週が間にあっても、宝箱は同じように出る（休みは損にしない）

### 9-6. 今週は休む（F-REST-1）

- `restWeeks` に今週の月曜日を入れる。選べるのは今週だけ（ホームの「ペース」のボタン）。取り消せる
- 効果は完走見込みの計算から外すことだけ。ほかの表示は変えない
- 先の週を選ぶ機能は持たない（年末年始や1月の予定は、その週になってから押す）

### 9-7. 完走見込み（F-FC-1）

- 記号
  - `R` = 残りの本線の目安（分）= 公開済みで未クリアの必須ステップの `minutes` の合計 ＋ 手元課題の未クリアの段階の `minutes` ＋ 未公開の章の `plannedMinutes`（おかわりは含めない）
  - `k` = 実際の倍率 = クリア済みステップの `activeSeconds/60` の合計 ÷ その `minutes` の合計。0.7〜2.5 に収める。クリア済みが10ステップ未満なら 1.5
  - `P` = 1週の学習時間（分）= 今週を除く直近4週のうち、`meta.app.createdAt` の週以降で、休みでない週の `sessions` の合計の平均（使い始めたあとの学習0分の週は含める。使い始める前の週は数えない）。そういう週が2つ未満なら 180（週3時間。画面に「仮」と出す）。下限 30
  - `W` = 必要な週の数 = `ceil(R × k ÷ P)`
- 見込みの日 = 今週から数えて、休みの週を飛ばしながら `W` 週目の日曜日
- 表示（ホームの下段「ペース」。05-visual-design.md 5-1。色は通常の文字色）
  - 見込み ≤ 2027-02-28: 「このままなら ◯月◯日ごろ（3月は予備）」
  - 見込み > 2027-02-28: 日付は出さない。`optional` を除いた `R` で計算し直し、それが 2/28 以内なら「おかわりを後回しにすると ◯月◯日ごろ（3月は予備）」。それも超えるなら「おかわりを後回しにすると ◯月ごろ」（3/31 を超えるときは「春ごろ」）
  - 2/28 を超えたことを知らせる文や記号は出さない（後回しの切り替え自体は後続 F-FC-2。MVP では、おかわりは地図から飛ばせばよい）
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
- 既知の制限: PWA とブラウザのタブを同時に開いて両方で操作すると、両方が数える（二重に数える）。README に書くだけにし、MVP では防がない

---

## 10. 質問文を作る（F-ASK）

### 10-1. 入れるもの

| 項目         | 中身                                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 前置き       | 「Java を学び直している専門学校生です。学習アプリの第◯章「◯◯」の問題を解いています」                                                                                                                                                             |
| 今の学習段階 | `course.yaml` の、今の章の `askStage`（例:「変数・if・for まで。配列・メソッドの宣言・クラスはまだ」）。`source: compact` の問題では「`void main()` の形（コンパクトソース）で書いている。`public class Main` の形にしないでください」を必ず足す |
| 要望         | ヒントだけ（既定）／説明して／答えも（作るたびに選ぶ。既定値の設定は持たない）                                                                                                                                                                   |
| 問題         | 題と `## 問題` の本文（Markdown のまま）                                                                                                                                                                                                         |
| 自分のコード | エディタの中身（全部）。手元課題は貼った出力から分かるファイル名だけ（コードは自分で足す、と書く）                                                                                                                                               |
| 結果         | コンパイルエラーの原文と行、例外の型と行、失敗したケースの期待と実際（各20行まで）、出力の最後の40行                                                                                                                                             |
| 自分の予想   | 「どこが怪しいと思う？」の1行（空なら見出しごと消す）                                                                                                                                                                                            |
| 試したこと   | 任意の1行（空なら見出しごと消す）                                                                                                                                                                                                                |
| 環境         | 「ブラウザ内の Java（teavm-javac。標準ライブラリは Java 21 相当）」または「JDK 25（Temurin）」                                                                                                                                                   |
| 入れないもの | 模範解答、ヒント3、テストの中身（失敗したものの名前と値だけ）                                                                                                                                                                                    |

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
- テンプレートは TypeScript の1か所だけに持つ（`.jq-ask.md` は MVP で作らないので、Java 側には持たない）

### 10-3. 問題を報告（F-STEP-12）

- GitHub の Issue 作成画面（`https://github.com/asahi1999/java-study-tracker/issues/new?title=…&body=…`）を新しいタブで開く
- 本文: 問題 ID・rev・教材の版・ブラウザ・自分のコード・結果。本文が 6,000文字を超えたら、URL には先頭だけを入れ、全文をクリップボードに入れて「全文はクリップボードに入れました。貼ってください」と出す（長い URL は開けないことがあるため。上限の正確な値は確かめていない）

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
    clientsClaim: true, // 初回の訪問から、ページを SW の管理下にする（無いと初回の先読みがキャッシュに入らない。04-spikes.md 3章で実測）
    globPatterns: ['**/*.{js,css,html,svg,png,json}'], // フォント（woff2）は事前キャッシュしない（05-visual-design.md 4-3）
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
        urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
        handler: 'CacheFirst', // ファイル名にハッシュが付く
        options: { cacheName: 'java-study-tracker-fonts' },
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

- `registerType: 'prompt'` のまま `skipWaiting` はしない。`clientsClaim` が効くのは、管理するページがまだ無い最初のインストールのときだけで、更新のときは「更新する」を押すまで古い SW のまま（この組み合わせでの更新の流れは未確認。15章）
- `tsconfig` の `types` に `vite-plugin-pwa/react` を足す（`virtual:pwa-register/react` の型。スパイク）
- エディタ（CodeMirror）は動的 `import()` でステップ画面を開くときに読む（ビルドで「500kB を超えるチャンク」の警告が出たため。N-PERF-2）
- `npm audit` で workbox-build が使う `glob`・`minimatch` に moderate が2件出る（ビルドのときだけ使う。スパイク）。CI では落とさず、記録だけする

### 11-2. teavm-javac（約7.6MB）の扱い

- 事前キャッシュ（precache）には入れない
  - 理由: Service Worker のインストールで毎回 7.6MB を落とすことになり、1つでも失敗するとインストール全体が失敗する。Workbox の既定の上限（2MiB）も超える
- 代わりに、実行時のキャッシュ（CacheFirst）に入れる。先読み（4-10）で `fetch` したものがそのままキャッシュされる → 初回のダウンロードが終われば、オフラインで動く（`clientsClaim` と、4-10 の「SW の管理を待ってから取得」の2つで成り立つ。スパイクで、初回の訪問 → オフライン → 再読み込みで取れることを確かめた）
- 「オフライン用に保存済み」の判定: `caches.open(cacheName)` に全ファイルがあるか（設定画面）
- 版を上げたら、起動時に `java-study-tracker-teavm-` で始まる古いキャッシュを消す（`cleanupOutdatedCaches` は事前キャッシュしか消さないため）
- 教材の JSON（`chNN.json`）と画面は事前キャッシュする（スパイクでは CodeMirror を含めて 8件 605KiB）
- GitHub Pages は大きな `.wasm` を gzip で返す（ほかの github.io のサイトで確認。04-spikes.md 7-1）。compiler.wasm は約 1.83MB になる見込み。自分の URL では公開後に確かめる

### 11-3. 更新

- 新しい版があると、ヘッダーに「更新があります [更新する]」。押すと `updateServiceWorker(true)`
- 書きかけは自動保存しているので、更新で失われない（押す前に、保存待ちの書きかけを保存してから再読み込みする）

### 11-4. CSP

- 本番のビルドの `index.html` にだけ `<meta http-equiv="Content-Security-Policy">` を付ける（開発サーバーは Vite がインラインのスクリプトを入れるので付けない）
- 中身: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'`
  - `style-src 'unsafe-inline'` は CodeMirror が `<style>` を足すため（自信は中くらい。フェーズ1 の e2e で、CSP を付けた本番ビルドでエディタの色が付くことを確かめる）
- `<meta>` の CSP で teavm-javac が動くことは確かめた（04-spikes.md 5章。Chrome・WebKit）。`<meta>` の CSP は Worker の中には効かない（Worker は自分のレスポンスヘッダーの CSP に従い、GitHub Pages はヘッダーを付けられない）。Worker の中は守られないことを受け入れ、学習者の Java から JS を呼ぶ口を渡さないこと（02-requirements.md N-SEC-3）で守る
- ヘッダーで CSP を付けられる配信先に移すときは、読み込み用 JS の `new Function` を置き換えた版が要る（スパイクで動いた。ただし teavm-javac を更新するたびに直し直しになるので、今は採らない）

---

## 12. CI

### 12-1. ジョブ（`.github/workflows/ci.yml`）

| ジョブ    | 中身                                                                                                                                                                                                                                                             | 時間の目安                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `check`   | 今まで: lint・整形・型チェック・テスト（Vitest）・ビルド。足す: `teavm:verify`（SHA256SUMS の照合）。`content:build`（`ids.lock` の検査を含む）は `pre*` で自動。JDK なしで `npm run build` が通ることもここで守る（12-3）                                       | 5分                          |
| `content` | `actions/setup-java`（temurin、`java/JDK_VERSION` の版）→ `npm ci` → `classlib:verify` → `content:verify`（キャッシュつき。Scanner の適合・double の一致を含む）→ `workspace:build` → 作業フォルダの検証 → teavm の本物を使う Vitest（`vitest --project teavm`） | 変わった問題だけなら 3〜10分 |
| `e2e`     | `npm ci` → `npx playwright install --with-deps chromium` → `npm run build` → `vite preview --port 4317` → Playwright（Chromium のみ。12-2）                                                                                                                      | 5分                          |

```yaml
content:
  name: 教材の検証（JDK 25 と teavm-javac）
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with: { node-version-file: .nvmrc, cache: npm }
    - uses: actions/setup-java@v6 # 2026-11-27 時点の最新 v6.3.0（04-spikes.md 7-3）
      with:
        distribution: temurin
        java-version-file: java/JDK_VERSION # 中身は「25.0.5」。読めなければ java-version: '25.0.5'
    - run: npm ci
    - uses: actions/cache@v6 # 最新 v6.1.0（04-spikes.md 7-3）
      with:
        path: .cache/content-verify
        key: content-verify-${{ hashFiles('content/**', 'java/**', 'scripts/**', 'public/java/**') }}
        restore-keys: content-verify-
    - run: npm run classlib:verify
    - run: npm run content:verify -- --jobs 4
    - run: npm run workspace:verify
    - run: npm run test:teavm
```

- `actions/setup-java` に JDK 25 を入れる。`java-version-file` で `java/JDK_VERSION` を読む。setup-java v6.3.0 のソースでは、`.tool-versions`・`.sdkmanrc` 以外の名前は `.java-version` の形（数字で始まる最初の語）として読む（04-spikes.md 7-3。Actions で動かしてはいない）。最初の CI のログで、入った Java の版を確かめる（Temurin の 25 系の最新は `25.0.5.1+2`）
- `npm test`（`check` ジョブ）は JDK も teavm も使わない。teavm を使うテストは `test:teavm` に分ける（`npm test` を速く保つ）
- `test:teavm` は Node で teavm を何度も使うと落ちることがある（research）ので、テストファイルごとに別のプロセスで動かす（Vitest の `pool: 'forks'`、`isolate: true`）。コンパイラ内部のエラーは1回だけやり直す。不安定なテストは CI に入れない
- Spring Boot（p09）: 別のワークフロー `content-spring.yml`。`on.push.paths: ['content/projects/p09/**']` のときだけ `./mvnw -B test`

### 12-2. Playwright のテスト（数本だけ）

- Chromium だけ（対象のブラウザが Chrome なので）。WebKit は macOS の Playwright では動いたが（04-spikes.md 2章）、Linux の WebKit で動くかは未確認で、対象外のブラウザなので CI には入れない
- テスト
  1. 初回起動 → ホームに第0章の最初のステップ → 小問を解いて松明が全部ともる（CSP を付けた本番ビルドで。エディタに色が付く）
  2. 無限ループのコード → 時間切れの表示、画面は固まらない
  3. v1 のデータを入れた状態で起動 → 旧記録に v1 のメモが出る。設定の「v1 のデータを JSON で書き出す」で、v1 と同じ形のファイルが保存される
  4. 初回の訪問 → 先読みが終わる → オフライン（`context.setOffline(true)`）→ 再読み込み → 実行できる（2回目の訪問を挟まない）
  5. 非対応のブラウザ（`addInitScript` で `WebAssembly.validate` が false を返すようにする）→ 「Chrome で開く」の案内が出る。書く問題で「手元で実行」の出力を貼ると判定される
- `base: '/java-study-tracker/'` のまま `vite preview` で動かす
- 時間切れの値は余裕をもたせる（遅い CI でも落ちないように）

### 12-3. 公開（deploy.yml）

- 変更なし（main の CI が通ったら公開）。`npm run build` が `content:build` と `workspace:build` を含むので、教材と zip も公開される
- deploy.yml には `setup-java` が無い。そのため `content:build` と `workspace:build` は JDK を使わない（`Check.java` は TypeScript が文字列から作る）。JDK が要るもの（`jq-shim` の `.bin`）は手元で作ってコミットし、CI の `content` ジョブで作り直して一致を確かめる（4-6）。`check` ジョブ（JDK なし）で `npm run build` が通ることで、この決まりを守る
- revamp ブランチは公開されない。main へのマージはユーザーの判断（00-brief.md）

---

## 13. 実装フェーズ

- 原則
  - **第0章が revamp ブランチの `npm run dev` で遊べる状態を最優先にする**（作る時間が勉強を食わないように。critic-user.md 5-1）。そのあとは「利用者が次に何をできるようになるか」の順に足す
  - 教材の形式と検証を早く作り、教材の作成（別エージェント）を実装と並行させる
  - 公開（main への反映）は MVP 完了後（フェーズ6）。それまで利用者は revamp ブランチの開発サーバー（決まったポート。2-2）で学ぶ。記録はそのオリジンの IndexedDB に残り、公開のときにエクスポート → 本番でインポートして移す（3-3）
- 各フェーズの終わりに、lint・整形・型チェック・テスト・ビルド・（あれば）content・e2e がすべて通った状態でコミット
- 各フェーズの完了の条件の1行目に「利用者ができるようになること」を書く

| フェーズ                      | 中身                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 完了の条件                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 確認                        | 済み（04-spikes.md）。残りの未確認は15章で、該当するフェーズで確かめる                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1 第0章で遊べる（最優先）     | teavm-javac の同梱（SHA256SUMS・SOURCE.md・THIRD_PARTY_NOTICES.md・`teavm:verify`）／2つの Worker と `JavaRunner`・`teavmRunner`・`fakeRunner`（時間切れ・出力の上限・`started`。エラーの表示は原文と行だけ）／ハーネスの `mode: output` の部分（`JqRun`・`JqCapture`・`JqProtocol`・`JqText`、`JqCases`・`JqEntry` の生成、5-4 の判定の行）と外枠（4-5）・事前の検査／`src/content/schema.ts`（全部の種類）と content-build（`ids.lock` を除く）／content-verify の最小（Solution・Starter・wrong・`expectError` の落ち方、`expected` の作成、JDK と teavm の一致）と CI の `content` ジョブ／v2 の DB（全表を `version(1)` で定義。使うのは `meta`・`progress`・`drafts`・`attempts`）／画面: ホーム（次の1ステップのカードだけ）、ステップ（説明カード・予想・穴埋め・修理・絵: エディタ、実行、松明、タイル、差分、ヒント、書きかけの保存、`//@write`・`//@fold`）／v1 の画面をルートから外す（ファイルは残す）／開発サーバーの決まったポート／CSP（11-4）／Playwright の 1・2（12-2）／**教材: 第0章（カード3・小問8。`reviewed: true`）** | **利用者が revamp の `npm run dev` を Chrome で開き、第0章（p00 を除く）を最後まで解ける。**再読み込みしても進み具合と書きかけが残る。ここから使い始め、カリキュラムの第1週を数え始める（02-requirements.md 7-1）                                                                                                                                                                                                                                                                                                   |
| 2 第1〜2章を学べる            | ハーネスの `mode: tests`・`both`（`JqTests`、`JqProblemTests`）／Scanner の代わりと classlib-patch・適合テスト（4-6）／double の一致（6-9）／content-verify の残り（使ってよい文法・ブラウザで使わない書き方・時間の 1/3・alt・キャッシュ・並列）／`ids.lock`（6-8）／`prohibited.ts` の画面の注意（F-RUN-7）／エラーの整形（4-7）と図鑑の判定（4-8。記録だけ。図鑑の画面はフェーズ4）／地図（F-MAP-1）／教材の作成は並行（第1章 → 第2章）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **利用者が第1〜2章を解ける**（`Scanner` の問題、テスト関数の問題を含む）。CI の `content` が通る。壊した見本を content-verify が全部落とす                                                                                                                                                                                                                                                                                                                                                                          |
| 3 v1 の記録とデータの出し入れ | v1 からの移行（3-3。失敗の帯、読み直し）、**v1 のデータを JSON で書き出す**（F-DATA-4）、エクスポート・インポート（v1・v2 形式）、旧記録の画面（記録のタブ）、設定（テーマ・タイルの大きさ・Java 実行環境・データ）、ルーティングとレイアウト（ナビ・ヘッダー。05-visual-design.md 7-10）、v1 の画面とロジックの削除（2-2）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **利用者が v1 の記録を旧記録で見られ、v1 のデータを JSON で書き出せ、v2 の記録をエクスポート・インポートできる。** v1 の作ったデータ（14章の fixture）で移行のテスト（fake-indexeddb）と e2e の 3 が通る。v1 の DB に書き込んでいないことをテストで確かめる                                                                                                                                                                                                                                                         |
| 4a 学びを助ける               | 質問文（10章）、問題を報告、「手元で実行」（`JqCheck.java` の作成と貼り付けの判定、コンパイルエラーの読み取り。5-6）、非対応ブラウザの判定と案内（4-9）、教材の更新時の知らせ（F-STEP-13）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **利用者が行き詰まったときに質問文を作れ、ブラウザで動かないときも手元で判定できる。** e2e の 5 が通る                                                                                                                                                                                                                                                                                                                                                                                                              |
| 4b 報酬と見通し               | レベル（「次まで ◯ステップ」）、技カード（銅）、エラー図鑑の画面と発見カード、宝箱と解き直し（`meta.welcome`）、おみやげ、今週は休む、完走見込み（ホームの「ペース」）、学習時間の記録と記録の画面、作品、ホームの残り（05-visual-design.md 5-1）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **利用者がレベル・技カード・図鑑・作品で進み具合を見られ、休んでも宝箱で戻れる。** domain の単体テスト（14章）と画面のテスト（RTL、偽の JavaRunner）が通る                                                                                                                                                                                                                                                                                                                                                          |
| 5 手元課題と PWA              | workspace-build、`Check.java`、クリアコード、出力の貼り付け、準備の手順、p00 をコースの並びに入れる、PWA（11章）、ライセンス画面                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **利用者が手元課題（p00〜p02）を VS Code で進めて記録でき、PWA をインストールしてオフラインで使える。** CI で全手元課題の `Check.java` が通る。e2e の 4 が通る。手元で zip を展開して `Cmd+Shift+B` が動く（エージェントが手元の JDK で確かめる）                                                                                                                                                                                                                                                                   |
| 6 MVP の仕上げと公開の準備    | 第0〜2章（カード11・小問32・p00〜p02）が全部レビュー済み、README・スクリーンショット                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **利用者が本番の URL で、開発サーバーで学んだ続きから学べる。** 全部 `reviewed: true` で CI が通る。**公開（main への反映）はユーザーに確認する**。公開の手順（利用者がやること）: (1) v1 の設定画面から JSON を書き出して保管 (2) その JSON を開発サーバーの v2 でインポートし（`schemaVersion: 1`）、旧記録が読めることを確かめる（本物のデータでの予行） (3) 開発サーバーの v2 でエクスポート (4) main に反映 (5) 本番を開く（v1 の移行が自動で動く） (6) 本番で (3) のファイルをインポート（旧記録は残る。3-3） |
| 7〜 後続                      | 02-requirements.md の「後」の番号順: 1 クイズ（第9章に必要）、2 並べ替え、3 解き直し（ライトナー）・技カードの銀金・魔物のタイル、4 近道ルート、5（教材: 第3章以降を常に2章先まで）、6 `#/clear/` の受け取り、7 分かったこと、8 振り返り、9 色とコマ送り、10 旧データの削除、11 ログイン時に開く案内、12 `.jq-ask.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 項目ごとにテストと CI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

- 教材の作成の順番（フェーズ1の schema と content-build ができたら、並行）: 第0章 → 第1章 → 第2章（MVP）→ 第3章（利用者が第1章を終える前）→ 以後「2章先まで」
- 第1章は `Scanner`（フェーズ2）を使うので、フェーズ2 は利用者が第0章を終える前（使い始めて1週間以内）に終えるのが目標。間に合わなければ、第1章のうち `Scanner` を使わない問題を先に公開する
- フェーズ1 では、エラー図鑑・レベル・宝箱・見込み・作品・旧記録・PWA・手元課題を作らない（後のフェーズ）。学習の記録（`progress` の `clearedAt`・`points`、`attempts`）は残しておく。フェーズ4b で、技カード（銅）は過去のクリアから埋め、レベルは `progress` から計算するので、過去の分も数えられる（図鑑はフェーズ2 から記録する）

## 14. テスト方針

| 層                | 道具                                               | 対象                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 純粋関数          | Vitest（node 環境）                                | `domain/` 全部: 外枠（`wrap.json`。import なし・コメントやテキストブロックの中の import）、事前の検査、プロトコルの読み取り（`protocol.json`: 改行なしの出力のあと、別の問題の出力、`total = 0`、`\u001E` なし、`limit`）、差分、予想の正規化、タイルの配置と全角、クリアコード（共通テストデータ）、`Check` の出力の読み取り（別の課題・`JQ-COMPILE`）、`JqCheck.java` の行の直し（+2）、`JqCases` の生成（`cases.json`）、次のステップ（書きかけ・先へ・のぞいただけ・p00）、レベルと「次まで ◯ステップ」、技カード、図鑑、宝箱（日付の境目 6/7/13/14/27/28 日、起動時の順番、あとで開ける）、おみやげ、休み、完走見込み（使い始める前の週を数えない、2/28 と 3/31 の境目）、移行の変換と「旧記録あり」の条件、エクスポートの形、質問文、`prohibited.ts`。目標カバレッジ 90% |
| 教材のスキーマ    | Vitest                                             | `content/schema.ts`（正しい例と、項目ごとの間違いの例）、content-build（`tests/content-fixtures/`。`ids.lock` の落とし方、wrong の宣言なし、Starter の印）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DB                | Vitest＋fake-indexeddb（v1 と同じ）                | リポジトリ、移行（v1 の DB を作って入れる → 移行 → v1 が変わっていない）、v1 の書き出し（v1 の DB を読むだけ・v1 と同じ形・Zod を通らないデータもそのまま）、インポート（v1 形式・v2 形式・壊れたもの・旧記録が空の v2 で今の旧記録が残る）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 移行の fixture    | `tests/fixtures/v1/`                               | 作ったデータではなく、v1 の `createInitialRoadmap`（`seed.ts`）と v1 の `createBackup` で作ったもの。「seed だけ（旧記録なし）」「ログ・メモ・バッジあり」「Zod を通らない」「v1 の DB が開けない → 次の起動で読み直す」                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 教材の更新        | Vitest（画面）                                     | 消えた ID の記録、rev 違いの書きかけ（「問題が新しくなりました」）があっても画面が壊れない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 画面              | Vitest＋Testing Library（jsdom）                   | ホーム、ステップ（`fakeRunner` で結果を返す）、手元課題の貼り付け、図鑑、設定。キーボード操作と `aria-live`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Java 実行の中心   | Vitest（node、`--project teavm`。`pool: 'forks'`） | `runtime/java/core/` を本物の teavm-javac で: Hello、コンパイルエラーの行と列、例外の型、Scanner の代わり、判定の行（改行の前置き）、`System.exit`、StackOverflow                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Worker を含む通し | Playwright（Chromium）                             | 12-2 の5本                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Service Worker    | Playwright（Chromium）                             | 初回の訪問でのオフライン（12-2 の 4）。更新の確認（`prompt`）で書きかけが消えないこと（フェーズ5 で1本）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 教材              | content-verify（CI の content ジョブ）             | 6-9 の表                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ハーネス（Java）  | content-verify の中で                              | 共通テストデータ（外枠・クリアコード・`cases.json`・`protocol.json`）、`JqText.normalize`、JSON のエスケープ（改行・引用符・制御文字・絵文字）、Scanner の適合（`scanner.json`）、double の表示（`double.json`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

- jsdom では Worker と Wasm が動かないので、画面のテストは `JavaRunner` を偽物に差し替える（critic-tech 4-4）
- 時刻を使うものは v1 の `tests/time.ts` の作り方で固定する
- 学習者が解く問題の答えをテストに書かない（ネタバレを避けるため、画面のテストは見本の教材 `tests/content-fixtures/` を使う）
- 本物の Chrome（利用者の Mac）では、フェーズ1 の完了時に利用者が第0章を解くことが確認になる。Safari は対象外なので確かめない

---

## 15. 未確認のことと確かめ方

### 15-1. 04-spikes.md で済んだもの

| 項目                                    | 結果                                                                                                               | 設計に入れたところ                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| teavm-javac がブラウザで動くか          | Chrome 158・Chromium 159・WebKit 27.2（macOS）で動いた。利用者の Safari 18.1.1 は WasmGC 非対応で動かない見込み    | 対象を Chrome に（02-requirements.md N-BR）。4-9 |
| 例外の行番号                            | Chrome では取れる。WebKit では取れない                                                                             | 4-7（取れたときだけ）、5-4                       |
| Playwright の WebKit                    | macOS では動いた。Linux は未確認                                                                                   | 対象外のブラウザなので CI には入れない（12-2）   |
| vite-plugin-pwa 2.0.0 と Vite 8.3.8     | ビルド・登録・オフラインで動いた。初回の訪問でキャッシュされない問題は `clientsClaim: true` で解決                 | 11-1、4-10                                       |
| CodeMirror の Java 25 の色付け          | 構文木は一部崩れる。色はおおむね付く。`record`・`sealed`・`permits` は `styleTags` で色を足せる。`when` は足せない | 下の注、6-1（折りたたみは構文木に頼らない）      |
| CSP（`eval` なし）                      | `<meta>` なら元の JS のままで動いた                                                                                | 11-4                                             |
| Worker と時間切れ、2回目以降の時間      | 動いた。中央値 Chrome 0.47〜0.53秒                                                                                 | 4-2・4-4                                         |
| GitHub Pages の `.wasm` の gzip         | gzip で返る（ほかの github.io）                                                                                    | 11-2、4-10                                       |
| `JqCheck.java` の `class` の形          | 動いた                                                                                                             | 5-6                                              |
| `actions/setup-java` などの最新版       | setup-java v6.3.0、cache v6.1.0、checkout v7.0.1、setup-node v7.1.0                                                | 12-1                                             |
| 使わないキャストの `ClassCastException` | teavm-javac では出ない                                                                                             | 02-requirements.md 8-3                           |

- CodeMirror の注: エディタの設定に `javaLanguage.configure({ props: [styleTags({ 'record sealed permits': tags.definitionKeyword })] })` を足す。試験は「構文木にエラーの節が出ない」ではなく「主な書き方で色が付く（トークンを見る）」にする。自動インデント・折りたたみ・構文木を使う lint など、構文木に頼る機能は崩れる前提で使わない（自動インデントの崩れは未確認）

### 15-2. まだ確かめていないもの

| 未確認                                                                                        | 分かっていること                                                                       | 確かめ方                                                                                                                                               | いつ          |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| WasmGC の判定用の最小モジュール                                                               | —                                                                                      | 候補のバイト列を Chrome の `WebAssembly.validate` で確かめる。false になる側は Playwright で偽って確かめる                                             | フェーズ1     |
| CSP で CodeMirror の色が付くか（`style-src 'unsafe-inline'` が要るか）                        | CodeMirror は `<style>` を足す（自信は中くらい）                                       | CSP を付けた本番ビルドで e2e の 1 を動かす                                                                                                             | フェーズ1     |
| teavm-javac の javac の英語の文言が JDK と同じか                                              | 同じ jdk25u の javac のはず。コンパイルエラーの文言は3ブラウザで同じだった（スパイク） | `errors-fixtures` で CI が確かめる                                                                                                                     | フェーズ1〜2  |
| `java-version-file: java/JDK_VERSION` を Actions で読めるか。`25.0.5` でどの Temurin が入るか | setup-java のソースでは読めるはず                                                      | 最初の CI のログを見る。だめなら `java-version: '25.0.5'` を直接書く                                                                                   | フェーズ1     |
| `@fontsource` の DotGothic16 のパッケージ名、フォントでの初回のダウンロード量                 | 05-visual-design.md 9章                                                                | `npm view` で確かめる。ビルドの出力の大きさを測る                                                                                                      | フェーズ1     |
| 代わりの `Scanner` が JDK と同じ動きをするか                                                  | research で基本の動きは確かめた                                                        | 適合テスト（4-6）                                                                                                                                      | フェーズ2     |
| teavm-javac の `double` の表示が JDK と同じか                                                 | research で一致を見たのは限られた値だけ                                                | `double.json`（6-9）                                                                                                                                   | フェーズ2     |
| 遅い PC での実行時間                                                                          | この Mac では中央値 0.5秒前後                                                          | content-verify の「時間の 1/3」で余裕を持たせる                                                                                                        | —             |
| `registerType: 'prompt'` ＋ `clientsClaim: true` での更新の流れ                               | —                                                                                      | 版を2つビルドし、Playwright で「更新する」を押して、書きかけが残ることを見る                                                                           | フェーズ5     |
| VS Code の Java 拡張が章ごとの同じ名前のクラスを重複エラーにするか                            | 手元に Extension Pack for Java が入っている                                            | 作業フォルダを VS Code で開いて Problems を見る。だめなら「章のフォルダだけを開く」（`code ~/java-quest/ch03`）と案内                                  | フェーズ5     |
| macOS の展開で `mvnw` の実行権限が残るか                                                      | —                                                                                      | 作った zip を Finder で展開して `./mvnw -v`                                                                                                            | 第9章の作成前 |
| macOS で PWA をログイン時に開けるか                                                           | —                                                                                      | Chrome の PWA を「システム設定 > 一般 > ログイン項目」に足せるか試す                                                                                   | 後続 11       |
| Spring Boot 4.0 系と JDK 25                                                                   | —                                                                                      | Spring Boot の公式ドキュメントの System Requirements を読む。Spring Initializr（start.spring.io）で Java 25 を選んだプロジェクトを手元で `./mvnw test` | 第9章の作成前 |
| JUnit を使った Spring のテスト（MockMvc の設定が 4.0 で変わったか）                           | —                                                                                      | 上と同じプロジェクトで `@SpringBootTest` を1本動かす。p09 はまず Service の単体テストだけにする                                                        | 第9章の作成前 |

### 15-3. この設計のための実測（2026-11-27、scratchpad。リポジトリは変更していない）

- コンパクトソースのクラスは、別ファイルから名前で参照できない（javac: シンボルを見つけられません）→ 外枠（4-5）
- `import module java.base; final class Main { ... }` に包むと、teavm-javac・JDK 25 の両方で、判定のクラスから `new Main().twice(5)` と `new Main().main()` を呼べる
- コンパクトソースの暗黙の import（`List` など）は teavm-javac でも動く
- teavm-javac には `System.setIn` が無い（コンパイルエラー）→ `StdinBridge` を2つ用意
- 1ファイルに `import module java.base;`・入口のクラス・包んだ `Main` を並べたものは `java Run.java` で動く（`compact` の形。`class` の形は 04-spikes.md 7-2 で確認）
- javac の日本語・英語の文言（4-8 の表）
- Node 24.15.0 で `.ts` を直接実行できる（型の除去）
- npm: `vite-plugin-pwa` 2.0.0（peer `vite ^8.0.0`）、`@codemirror/lang-java` 6.0.2、`@lezer/java` 1.2.1、`@playwright/test` 1.65.1、`yaml` 2.9.1、`fflate` 0.8.3

# Java Study Tracker

[![CI](https://github.com/asahi1999/java-study-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/asahi1999/java-study-tracker/actions/workflows/ci.yml)

Java を3ヶ月で学ぶロードマップの進み具合と学習時間を記録する、ブラウザだけで動く学習トラッカーです。

- 公開URL：https://asahi1999.github.io/java-study-tracker/
- ログイン不要。データはすべて自分のブラウザの中に保存します

## 作った目的

- 3ヶ月のロードマップを、途中でやめずに最後までやり切るため
- 「今どこまで進んだか」「予定より遅れていないか」を、毎日ひと目で確かめたかった
- 設計・テスト・CI/CD まで含めて、1つのアプリを丁寧に作り切る練習として

## スクリーンショット

<!-- 画像は docs/screenshots/ に置いて、下の表に差し込む -->

| 画面           | 画像         |
| -------------- | ------------ |
| ダッシュボード | （追加予定） |
| ロードマップ   | （追加予定） |
| 週の詳細       | （追加予定） |
| 統計           | （追加予定） |
| スマホ表示     | （追加予定） |

## 主な機能

- **ダッシュボード**
  - 全体の進捗率と「残り◯日」
  - 月・ステップごとの進捗、今週の予定、遅れている週の警告
  - 今日・今週の学習時間と目標、連続学習日数
- **ロードマップ**：12週を「路線」に見立てた一覧。月ごと／ステップごとに切り替え
- **週の詳細**：チェックリスト、完成ボタン、GitHub リポジトリの URL、Markdown のメモ（自動保存）
- **学習タイマー**
  - どの画面からも使える
  - 再読み込みやタブを閉じても計測が続き、終了すると学習ログになる
- **学習ログ**：手動での追加・編集・削除。期間・週・ステップで絞り込み
- **統計**：予定と実績の折れ線（列車のダイヤに見立てた図）、学習カレンダー、週別・ステップ別の学習時間
- **実績バッジ**：16種類。条件を満たすと通知が出て、駅のスタンプのように押される
- **ロードマップ編集**：月・ステップ・週・チェック項目の追加・編集・削除・並び替え、初期ロードマップに戻す
- **設定**
  - テーマ（ライト／ダーク／システム）、学習開始日、目標時間、休止期間
  - エクスポート／インポート（JSON）、全データのリセット
- **そのほか**：キーボードだけで操作できる、スマホ対応、ダークモード

## 使用技術

| 用途         | 使ったもの                                      |
| ------------ | ----------------------------------------------- |
| 言語         | TypeScript 6（strict）                          |
| UI           | React 18                                        |
| ビルド       | Vite 8                                          |
| スタイル     | Tailwind CSS 3                                  |
| ルーティング | React Router 7（HashRouter）                    |
| データ保存   | IndexedDB（Dexie.js 4 + dexie-react-hooks）     |
| 状態管理     | Zustand 5（タイマーと通知だけ）                 |
| グラフ       | Recharts 3                                      |
| 日付         | date-fns 4                                      |
| 入力チェック | Zod 4                                           |
| Markdown     | react-markdown + remark-gfm                     |
| テスト       | Vitest + React Testing Library + fake-indexeddb |
| コード品質   | ESLint + Prettier                               |
| CI/CD        | GitHub Actions → GitHub Pages                   |
| 実行環境     | Node.js 24                                      |

### 選んだ理由

- **IndexedDB（Dexie.js）**
  - サーバーなしで動かしたかった。ログイン機能やサーバー代がいらない
  - localStorage より容量が大きく、表ごとにインデックスを張って検索できる
  - Dexie の `useLiveQuery` で、データが変わると画面が自動で更新される
- **HashRouter**
  - GitHub Pages はサーバー側で URL を書き換えられない
  - `/stats` のような URL で再読み込みすると 404 になるため、`#/stats` の形にした
- **Zustand**
  - 画面をまたぐ状態（学習タイマー・通知）だけに使う
  - それ以外のデータは IndexedDB を正本にして、状態を二重に持たない
- **Zod**
  - フォームの入力チェックと、インポートする JSON の検証を同じ書き方でできる
  - エラーを日本語で、項目ごとに出せる
- **Vitest**：Vite と設定を共有でき、パスの別名などを二重に書かずに済む
- **Tailwind CSS**：色を CSS 変数のトークンにして、ライト／ダークを切り替えている

## データ設計

IndexedDB のデータベース `java-study-tracker` に、次の7つの表を置いています。

| 表         | 内容                                                        |
| ---------- | ----------------------------------------------------------- |
| `months`   | 月（1ヶ月目〜3ヶ月目）とマイルストーン                      |
| `steps`    | 学習ステップ（①〜⑧）と、学ぶ内容・アドバイス                |
| `weeks`    | 週。所属する月とステップ、週番号、予定時間、状態、URL、メモ |
| `skills`   | 週ごとのチェック項目と、チェックした日                      |
| `logs`     | 学習ログ（日付・時間・週・やったこと・タイマー／手動）      |
| `badges`   | 獲得したバッジと獲得日時                                    |
| `settings` | 開始日・テーマ・目標時間・休止期間（1件だけ）               |

- 「遅れ」は保存せず、表示するときに予定日から計算する
- 週を削除しても学習ログは消さず、週との紐づけだけを外す
- 学習タイマーの状態とテーマの写しだけは localStorage に置く。起動直後に同期で読む必要があるため

## ディレクトリ構成

```
src/
├── App.tsx            # ルーティング
├── types/             # 型定義
├── data/              # 初期ロードマップ・バッジの定義
├── db/
│   ├── database.ts    # Dexie のスキーマ
│   ├── repositories/  # 表ごとの読み書き
│   └── services/      # 複数の表にまたがる手順（1つのトランザクションにまとめる）
├── lib/               # 計算ロジック（純粋関数だけ。予定日・進捗・連続日数・バッジ判定など）
├── stores/            # Zustand（学習タイマー・通知）
├── hooks/             # カスタムフック
├── components/
│   ├── ui/            # ボタン・カード・ダイアログなどの共通部品
│   └── layout/        # サイドバー・下部タブ・路線バー・タイマー
├── features/          # 画面ごとの部品
└── pages/             # URL に対応するページ
tests/                 # テストの共通設定
docs/SPEC.md           # 仕様書（実装中に決めたことも記録）
```

- テストは対象ファイルの隣に置いています（例：`src/lib/schedule.test.ts`）
- 画面から DB を直接触らず、必ず repositories か services を通します

## ローカルでの起動

Node.js 24 が必要です。

```bash
npm ci
npm run dev          # 開発サーバー（http://localhost:5173/java-study-tracker/）
```

## テスト・チェック

```bash
npm test             # テスト
npm run coverage     # カバレッジ
npm run lint         # ESLint
npm run format:check # Prettier の整形の確認
npm run typecheck    # 型チェック
npm run build        # 型チェック＋本番用のビルド
npm run preview      # ビルド結果の確認
```

## GitHub Pages へのデプロイ

1. GitHub に `java-study-tracker` という名前のリポジトリを作り、push する
2. リポジトリの **Settings → Pages** を開き、**Build and deployment** の **Source** を **GitHub Actions** にする
3. `main` に push すると、次の順に動く
   - `CI`（`.github/workflows/ci.yml`）：lint・整形・型チェック・テスト・ビルド
   - `Deploy`（`.github/workflows/deploy.yml`）：CI が成功したら、ビルドして GitHub Pages に公開
4. 公開先：https://asahi1999.github.io/java-study-tracker/

Actions の画面から `Deploy` を手動で動かすこともできます。

## データについての注意

- データはブラウザごとに保存されます。**PC とスマホでは同期されません。** 別の端末に移すときは、設定画面の「エクスポート」と「インポート」を使ってください
- Safari は、7日間使われなかったサイトのデータを消すことがあります。起動時に保存の継続（`navigator.storage.persist()`）を頼んでいますが、大事なデータは定期的にエクスポートしてください
- ブラウザの「サイトデータの削除」をすると、記録も消えます

## 工夫した点

<!-- 後で書く -->

## 苦労した点

<!-- 後で書く -->

## 今後追加したい機能

- 学習を忘れないためのリマインダー通知
- PWA にして、ホーム画面から開けるようにする
- 端末間の同期（今はエクスポート／インポートで移す）
- 週の振り返りメモのテンプレート

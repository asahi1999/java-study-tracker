# 実装の記録（設計書から変えたこと・分かったこと）

- 設計書（[03-design.md](03-design.md)）と違うことをしたとき、その理由をフェーズごとに書く

## フェーズ1a（Java と教材の土台）

- 実施: 2026-11-27（実装担当: Java 実行と教材の土台）
- 範囲: teavm-javac の同梱、ハーネス（`mode: output`）・外枠・事前の検査、`src/content/schema.ts` と content-build（`ids.lock` を除く）、content-verify の最小、CI の `content` ジョブ、Java 実行の中核（`src/runtime/java/`）。画面・v2 の DB・第0章の教材は次の担当

### 型とメッセージ（4-3・5-4）

| 設計                                       | 実装                                                                                                                                                       | 理由                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `RunJob` に「そのまま実行」の入力が無い    | `stdin: string` を足した                                                                                                                                   | 段階0に渡す入力（前書きの `stdin`）が要る                                                             |
| `RunResult` の種類                         | `cancelled` を足した（次の `run` か `cancel()` で止めたもの）。`precheck` に `line`、`timeout` に `timeoutMs`、`judged` に `asIs`（段階0のケース）を足した | 止めた `run` の Promise を必ず終わらせるため。画面の表示（「3秒たっても…」、事前の検査の行）に使う    |
| `Diagnostic`・`StageResult` などは名前だけ | `JavaRunner.ts` に定義した。`Diagnostic.origin`（`learner`・`given`・`tests`・`harness`）で 4-7 の表示を分けられる                                         | 型が無かった                                                                                          |
| `case` の行                                | `expected` は失敗したときだけ。`actual` はいつも入れる。`error` に `file` を足した                                                                         | content-verify がケースごとの JDK と teavm の一致を見るため。配るファイルの中の例外の行を見分けるため |
| `AssetUrls.shimClasses`                    | `string \| null`（フェーズ1は `null`）                                                                                                                     | 代わりの Scanner（jq-shim）はフェーズ2                                                                |

### Java の実行（4-2・4-4）

- run.worker の出力は「50ms ごと」に加えて「行の終わり」でも送る。Wasm を実行している間は Worker のタイマーが動かないので、50ms ごとだけだと、無限ループの前に出した行（判定の行を含む）がたまったまま届かず、時間切れのときの「途中までの出力」が空になった（Node で実測）。行の数は上限 2,000 行なので、送る回数も限られる
- Worker 側の出力の上限は、ハーネスの上限より少し大きくした（+1万文字・+500行）。判定の行の前の改行も数えてしまうのと、ハーネスの `limit` の行を先に届けるため。上限を超えたら、putchar の中で例外を投げて Wasm の実行を止める
- ハーネスの `JqCapture` は上限を超えたら `limit` の行を出して `System.exit(0)`
- Node では teavm の読み込み用 JS が `System.exit` で `onExit` ではなく `process.exit` を呼ぶ（`compiler.wasm-runtime.js` の中で `typeof process` を見ている）。そのため Node では app.wasm を Worker スレッドで動かし、`process.exit` を差し替えて終わりを知らせてから本当に終わらせる（`scripts/lib/teavm-node-worker.ts`）
- teavm の `putcharStdout` は UTF-16 の1単位を渡す（日本語・絵文字・`System.out.write(byte[])` の UTF-8 も正しく届く。実測）
- 学習者の `main` は「そのまま実行」とケースの数だけ呼ばれる。標準エラーに書いたものも回数分出る（画面の表示で気にするところ）
- 4-9 の対応ブラウザの判定（WasmGC の最小モジュール・`support.ts`）と `prefetch.ts` は作っていない（フェーズ4a と画面の担当）。4-10 の「Service Worker の管理を待つ」は `teavmRunner` の `prepare()` に入れた（登録が無ければ待たない）

### ハーネス（5章）

- ブラウザ版の `StdinBridge` は何もしない（フェーズ2で `java.util.Scanner.setInput(input)` にする）。入力を読む問題は teavm-javac でコンパイルできないので、content-verify が落とす
- 捕まえなかった例外は、`Exception in thread "main" <型>` と学習者・配るファイルの行だけを標準エラーに出す（メッセージは出さない。teavm で null になり JDK と食い違うため）
- 判定の行の JSON は ASCII だけ（日本語は `\uXXXX`）。手元のターミナルの文字コードに左右されないように
- `JqCases.tests(stage)` はフェーズ1では `{0, 0}` を返すだけ（テスト関数はフェーズ2）

### 教材（6章）

- content-verify の子プロセスは「問題ごと」ではなく「1回のコンパイルごと」に1つ（Node で同じ compiler.wasm を何度も使うと落ちることがある、への備えを強めた。1回あたり約1.2秒）
- content-verify のフェーズ1の範囲: Solution・alt・Starter・wrong の落ち方、`--update`、JDK と teavm の一致、既定の `toString`、predict・card の出力。**`errors.yaml` の fixture の検証も入れた**（`compile <図鑑 ID>` の宣言を確かめるのに判定の正規表現が要るため）。`--no-cache`（キャッシュ）・JDK で2回動かす・時間の 1/3・使ってよい文法・`prohibited.ts` はフェーズ2
- `errors.yaml` に MVP の12種を入れ、`errors-fixtures/` の11本で、javac（英・日）と teavm-javac の文言が 4-8 の正規表現に当たることを確かめた（15-2「teavm-javac の javac の英語の文言が JDK と同じか」は、この11種については一致）
- content-build の検査で、設計に無いものを足した: 書く問題の `expected/<i>.txt` が無い（`--update` の検証のときは除く）、predict の choice の正解がちょうど1つ、タイルの大きさ（80×40）、`Jq` で始まるクラス名。どれも 6-9 の表にあり、JDK が要らないので content-build でも見る
- `course.yaml` の `parts` は空でもよい（教材を作る前の章のため）。`project` の参照は `projects/` が1つも無い間は見ない（手元課題はフェーズ5）
- 手元課題の段階の `minutes` は 5〜25（設計は 15〜25）。p00 は約10分のため
- 「使ってよい文法」の `allow` の書き方（`course.yaml`）は、02-requirements.md 8-1 を写しただけ。検査（6-10）を作るフェーズ2で、語の形を決め直してよい

### 道具

- `test:teavm` は `vitest run --config vitest.teavm.config.ts`（設計は `--project teavm`）。テストのファイル名を `*.teavm.test.ts` にし、`npm test` からは外した
- `scripts/` のテストは `npm test`（jsdom の環境）で動く。`tests/setup.ts` が `window` を使うので、`@vitest-environment node` にはしない
- `public/java/manifest.json` は content-build が作るので git に入れない
- ESLint の対象から `docs/revamp/mockups`（デザインのモックの JS）を外した。前のコミットからこのファイルで `npm run lint` が落ちていたため

### ブラウザでの確認（`#/dev/java` の代わり）

- `#/dev/java` は画面の担当とぶつからないよう作らず、scratchpad の確認ページ（`teavmRunner` を直接使う。CSP の `<meta>` つき）を、開発サーバーと `vite build` → `vite preview` の両方でヘッドレス Chrome 158 で動かした
- 結果（どちらも同じ）: 準備 93〜135ms（ローカル配信）、1回目 917〜958ms、2回目以降 597〜668ms、コンパイルエラー 85ms。判定・失敗・コンパイルエラー（行と列）・例外（型と行）・時間切れ（2秒、途中までの出力あり）・出力の上限・StackOverflowError・`System.exit`・事前の検査・時間切れのあとの実行、すべて期待どおり。CSP の違反なし
- 画面の担当は、`#/dev/java` を作るなら `createTeavmRunner({ baseUrl: import.meta.env.BASE_URL, harness: browserHarness })` で同じことができる

### 未確認のまま

- `actions/setup-java@v6` の `java-version-file: java/JDK_VERSION`（最初の CI のログで Java の版を見る）
- CI（ubuntu）で content-verify と `test:teavm` が時間内に終わるか（この Mac では content-verify の見本 16秒、壊した見本 30秒、`test:teavm` 全体 約50秒）

## フェーズ1b（画面と DB）

- 実施: 2026-11-27（実装担当: 画面と DB）
- 範囲: v2 の DB、ホーム（次の1ステップのカード）、ステップ画面（説明カード・予想・穴埋め・修理・実装・絵。クイズも同じ部品で開ける）、デザイントークンとフォント、v1 の画面をルートから外す、開発サーバーのポート、CSP、対応ブラウザの判定（案内まで）、Playwright の e2e 1・2

### 置き場所

| 設計                                    | 実装                                                                                    | 理由                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/db/database.ts` を v2 に作り直す   | `src/db/v2/`（`database.ts`・`types.ts`・`progress.ts`・`drafts.ts`・`meta.ts`）        | v1 のファイルとテストはフェーズ3で消すまで `src/db/database.ts` を使う。消すときに名前を戻してよい              |
| `src/App.tsx` を v2 に作り直す          | `src/app/App.tsx`・`routes.tsx`。`main.tsx` はこちらを読む                              | v1 の `src/App.tsx` とテストを残したまま、ルートから外すため（ファイルはフェーズ3で消す）                       |
| `src/components/tiles/sprites.svg`      | `src/domain/tiles/tileTable.ts` のドットの表から `TileSprites.tsx` が `<symbol>` を作る | 色と形を1か所にまとめ、コントラストを Vitest で確かめやすくするため                                             |
| タイルは CSS グリッド（`div role=img`） | 格子全体を1枚の `<svg role="img">` にし、マスは `<use>`                                 | 80×40 でも要素が少なく、ドットがにじまない。読み上げは格子の `aria-label` だけで同じ                            |
| 床は1種類                               | `floor-a`・`floor-b` を市松に置く                                                       | 「行ごとに粒の位置をずらす」（05-visual-design.md 6-2）を簡単に出すため                                         |
| ロゴは 16×16 ドットの松明               | 8×8 の松明のタイルを拡大                                                                | 絵を増やさないため                                                                                              |
| 画面のテストの教材                      | `tests/contentFixture.ts` が見本の教材を content-build と同じ処理で JSON にする         | `scripts/` は Node の型を使うので、型を追わない動的 import で読む（`tsconfig.json` に Node の型を足さないため） |

### 画面

- ホームはカードだけ。持ち時間の3つのボタン（F-HOME-3）は、フェーズ1ではどれも同じ結果（手元課題が無い）なので出していない。ナビ・レベル・作品・下段はフェーズ3・4b。カードの幅はほかの枠が無いので 560px まで（05-visual-design.md 5-1 の 460px は作品の枠と並べたとき）
- ステップ画面の上の帯のパンくずは「部品の番号＋部品の名前」（モックと同じ）。部品に名前が無ければステップの題名
- 実行ボタンの横の時間は、押してから結果が出るまで（コンパイルを含む）。`attempts.durationMs` は設計どおり実行だけの時間
- 実行中の出力は流さず、結果が出てから出す。ハーネスは「そのまま実行」とケースの数だけ `main` を呼ぶので、流すと同じ出力が何度も出るため
- エラーの表示はフェーズ1の範囲（原文と行）に「◯行目へ移動」だけ足した。日本語の説明・図鑑はフェーズ2・4b
- 予想で間違えたらクリアにしない。解説と実際の出力を見せ、「もう一度答える」で答え直せる。「次のステップへ」は答えたあとならいつでも出す
- 説明カードの「わかった」は `progress` だけ書く（`attempts` には残さない。試行ではないため）
- 「書くのはここ」と折りたたみの印は、書きかけの行の並びが教材と同じときだけ付ける（ずれた範囲を畳んで学習者のコードを隠さないため）。折りたたみの帯はボタンで、押すと開く
- 非対応のブラウザ: ステップ画面の上に案内（N-BR-2）、説明カードと予想の「動かす」ボタンを隠す。「手元で実行」はフェーズ4a

### Java と対応ブラウザ

- WasmGC の判定のバイト列（4-9）: `00 61 73 6d 01 00 00 00 01 05 01 5f 01 7f 00`（struct を1つ持つ型の節）。Chrome 158 と Node 24 で `WebAssembly.validate` が true（実測）。`src/runtime/java/support.ts`
- 判定に通れば `meta.java.support = 'ok'`、通らなければ `unsupported` と、何もしない `JavaRunner`（`createUnsupportedRunner`）を使う。「Hello を実際に動かす」確かめはフェーズ4a
- 先読み（4-10）はホームの表示のあと `requestIdleCallback`（無ければ 1.5秒後）。ステップ画面を直接開いたときは、最初の実行で準備する

### 道具・設定

- 開発サーバーのポートは 5179（設計書 2-2 の仮の値のまま。3000・3001・5000・7000 と重ならず、空いていた）。`vite.config.ts` の `server: { port: 5179, strictPort: true }`、`npm run dev` は `vite --open`
- CSP（11-4）は `scripts/lib/csp.ts` の Vite のプラグインで、本番のビルドの `index.html` にだけ付ける。設計との違いが2つ
  - `index.html` の起動前のテーマのスクリプト（インライン）を許すため、中身の sha256 を `script-src` に足す
  - Vite は 4KB 未満のフォントを `data:` にして CSS に埋め込み、`font-src 'self'` で止められた（e2e で見つけた）。`build.assetsInlineLimit` でフォントだけ埋め込まない
- CSP を付けた本番のビルドで CodeMirror に色が付くことを e2e の 1 で確かめた（15-2 の「CSP で CodeMirror の色が付くか」は済み。`style-src 'unsafe-inline'` を外すと付かないかは試していない）
- e2e は `npm run e2e`: 見本の教材（`tests/content-fixtures/good`）で `.cache/e2e-dist` にビルドし、`vite preview --port 4317` で Chromium を動かす。ビルドのあと `src/content/generated` は本物の教材に作り直す。CI に `e2e` ジョブを足した
- フォントは `@fontsource/dotgothic16` 5.3.1（パッケージ名は 05-visual-design.md 9章のとおり）、`@fontsource/ibm-plex-mono` 5.3.0。v1 の Barlow Semi Condensed は `main.tsx` から外した（パッケージの削除はフェーズ3）
- `tests/setup.ts` で jsdom の `Range.getClientRects` を空の値にした（CodeMirror が位置を測ろうとして例外を出すため）。v2 の DB の表も毎回空にする

### 未確認のまま

- フォントの初回のダウンロード量（05-visual-design.md 9章）。PWA の precache から外すのはフェーズ5
- `prefers-reduced-motion` のときに松明の動きが止まることは、CSS の決まり（4-6）を入れただけで画面では確かめていない

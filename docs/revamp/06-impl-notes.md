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

## 教材担当（第2章）

- 実施: 2026-11-27。説明カード4枚・小問12問（予想3・穴埋め2・修理2・実装2・絵3。02-requirements.md 7-2 のとおり）。すべて `reviewed: false`
- 第1章の問題 ID・技カードには依存しない（`concepts` は第0章と第2章のものだけ）

### 今の仕組みに合わせて変えたこと

- 実装2問（勝敗判定・属性の相性）は `mode: output` で作った。入力（`Scanner`）も `mode: tests` もまだ使えないため、ひな形の折りたたみ（`//@fold`）の中で、ループと `switch` で場面（5つの戦い・9通りの組）を用意し、学習者は1回の実行で全部の分かれ道を通る判定を書く。ケースは1つずつ
- 修理「終わらない while」は、ループの中で何も出さない形にした。出し続けると時間切れではなく出力の上限（`output-limit`）で止まり、`expectError: timeout` に合わないため
- おかわり（`optional: true`）は「市松模様の床」と「属性の相性」の2問

### 後回しにした問題（今の仕組みで検証できない）

- 入力（`Scanner`、フェーズ2）を使う版
  - 勝敗判定: 勇者と魔物の HP を入力で受け、ケースごとに勝ち・負け・つづくを確かめる
  - 部屋の大きさ: 幅と高さを入力で受け、壁で囲んだ部屋を描く（手元課題 p02 の段階3と同じ形。ブラウザの小問として足すなら）
- テスト関数（`mode: tests`、フェーズ2）を使う版
  - 第2章はメソッドの宣言をまだ使わない（02-requirements.md 8-2）ので、テスト関数で値を確かめる問題は第3章から。第2章で作るものは無い

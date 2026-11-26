# ブラウザ内で Java をコンパイル・実行する方法の調査

- 調査日: 2026-11-27
- 目的: GitHub Pages（静的サイト・費用ゼロ）上で、学習者が書いた Java を「コンパイル → 実行 → 標準出力・エラー表示 → 判定」する
- 対象: 数行〜100行程度。標準入出力、クラス、コレクション、ラムダ/Stream。Spring Boot は対象外
- 表記: 公式情報や実測で確かめられなかったことは「未確認」と書く

## 結論（先に）

- **推奨: teavm-javac（OpenJDK の javac + TeaVM を WebAssembly にしたもの）を自前配信する**
  - Apache-2.0、無料、外部サーバー不要、オフライン（Service Worker）で動くことを実測で確認
  - Java 25 の文法まで通る（record、パターンマッチ、`_`、コンパクトソースファイル `void main()` + `IO.println` まで実測で確認）
  - 1回のコンパイル＋実行: 約0.45〜1.0秒（M1 Mac、Chrome 158）。初回ダウンロードは約4.5MB（圧縮後）
  - 弱点: 標準ライブラリが TeaVM の再実装なので、JDK と出力が違う箇所がある（HashMap の順番、Random、例外メッセージなど）。`Scanner` は存在しない → 自作の代替クラスで解決できることを確認
- **次点: CheerpJ（JavaFiddle 方式）** — 本物の JVM なので互換性は高いが、無料枠は CDN 読み込みが条件でオフライン不可、「Built with CheerpJ」表記が必要、JavaFiddle は Java 8 の javac
- **どの方式でも出せない場面の代替**: 出力予想・穴埋め・並べ替えなど「実行しない問題」＋重い課題は手元の JDK

---

## 1. 候補一覧

| 候補                                                   | ブラウザで javac                         | Java の版                                                               | 費用・ライセンス                                                                     | オフライン                         | 保守                                 | 評価                                        |
| ------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------ | ------------------------------------------- |
| **teavm-javac**                                        | できる（javac 本体）                     | javac は jdk25u 由来。Java 25 文法まで実測で通過                        | 無料。Apache-2.0（README 記載）。中身に OpenJDK（GPLv2 + Classpath Exception）を含む | できる（実測）                     | 2026-11-22 に更新。作者1人           | **推奨**                                    |
| CheerpJ（+ tools.jar）                                 | できる（JavaFiddle が実例）              | ランタイムは 8/11/17/21、25 はプレビュー。JavaFiddle の javac は Java 8 | 個人は Community（無料）。CDN 読み込み必須・表記必須                                 | 無料枠では不可（自前配信は有料枠） | 活発（5.0）                          | 次点                                        |
| GraalVM Web Image                                      | javac の Wasm デモあり（コンパイルのみ） | 未確認                                                                  | GraalVM 自体は無償（詳細ライセンス未確認）                                           | —                                  | 実験的機能                           | 不採用（実行できない）                      |
| Doppio                                                 | Java 8 の javac を動かせる               | Java 8                                                                  | MIT                                                                                  | 可能                               | 2022-12 以降更新なし                 | 不採用                                      |
| TeaVM / J2CL / Bytecoder / GWT / JSweet 単体           | できない（ビルド時に変換するツール）     | —                                                                       | Apache-2.0 など                                                                      | —                                  | 活発                                 | 単体では不可（teavm-javac は TeaVM を利用） |
| OpenJDK を Wasm に移植（JavaBox など個人プロジェクト） | 報告あり                                 | 21                                                                      | 不明                                                                                 | 不明                               | 個人の実験                           | 不採用（未確認が多すぎる）                  |
| Java のサブセットを JS で解釈するインタプリタ          | 自作になる                               | サブセット                                                              | —                                                                                    | 可能                               | 保守中の既製品は見つからず（未確認） | 不採用（作る量が大きい）                    |
| 外部実行 API（Judge0、Piston など）                    | サーバー側                               | 新しい                                                                  | 無料枠・鍵の方針が変わる                                                             | 不可                               | —                                    | 不採用（条件違反）                          |

### 1-1. teavm-javac（推奨）

- リポジトリ: https://github.com/konsoletyper/teavm-javac （作者は TeaVM と同じ Alexey Andreev）
- 中身: OpenJDK の javac と TeaVM を、TeaVM 自身で 1つの WebAssembly（WasmGC）にしたもの
  - 流れ: Java ソース →（javac）→ .class →（TeaVM）→ 学習者プログラムの .wasm → 実行
- ライセンス
  - README: Apache License 2.0。OpenJDK 部分は GPLv2 + Classpath Exception で、ソースの改変はしていないと記載
  - GitHub の API ではライセンス欄が空（LICENSE ファイルを GitHub が認識していない）。README の記載が根拠
  - 配布物（compiler.wasm）に javac のバイナリが入るので、README や「ライセンス」画面に OpenJDK（GPLv2+CE）と TeaVM（Apache-2.0）の表記と、ソースへのリンクを置くのが無難（法的な要件の詳細は未確認）
- javac の版: ビルド設定 `javac/build.gradle` が `openjdk/jdk25u` のソースを取得している。Java 25 の新文法まで実測で通過（下の実験）
- 配布ファイル（テストに使った https://teavm.org/playground/4/ のもの）

| ファイル                   | 元のサイズ | gzip 後            | 役割                                                                                                    |
| -------------------------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| compiler.wasm              | 4.86MB     | 1.83MB             | javac + TeaVM                                                                                           |
| runtime-classlib-teavm.bin | 2.44MB     | （元々 gzip 済み） | TeaVM の標準ライブラリ実装                                                                              |
| compile-classlib-teavm.bin | 0.21MB     | （元々 gzip 済み） | javac が見る標準ライブラリの型情報                                                                      |
| compiler.wasm-runtime.js   | 18KB       | 6KB                | 読み込み用 JS                                                                                           |
| deobfuscator.wasm（任意）  | 49KB       | 22KB               | 例外のスタックトレースに行番号を出す（Maven の `org.teavm:teavm-wasm-gc-deobfuscator:0.17.0` から取得） |

- 合計: 約7.6MB（gzip 配信なら約4.5MB）。GitHub Pages が `.wasm` を gzip で返すかは未確認
- 必要なブラウザ機能: WasmGC など（webassembly.org の表では GC 対応は Chrome 119 / Firefox 120 / Safari 18.2 から）。どの例外処理方式を使うかは未確認。実測したのは Chrome 158（ヘッドレス）と Node 24.15 のみ
- COOP/COEP: 不要（`crossOriginIsolated=false` のまま動作。SharedArrayBuffer を使っていない）
- 保守: teavm-javac は 2026-11-22 に「安定版 TeaVM 0.17.0 に切り替え」のコミット。TeaVM は 0.17.0 を 2026-11-22 に公開、スター約3,150。teavm-javac は作者1人・スター92なので、止まるリスクはある → ファイルを自分のリポジトリに置いて固定すれば、止まっても動き続ける

### 1-2. CheerpJ（次点）

- 本物の OpenJDK を WebAssembly/JS で動かす JVM。公式ドキュメント（2026-11 時点）で現行 5.0、Java 8（既定）/11/17/21、25 はプレビュー
- ライセンス（https://cheerpj.com/licensing/ 、https://cheerpj.com/docs/licensing ）
  - Build の Community（無料）: 個人・1人会社・非商用 OSS が対象。「Built with CheerpJ」の表記が必要。CDN（cjrtnc.leaningtech.com）から読み込むこと
  - 自前配信（self-hosting）は Community の範囲外（Small Business の追加オプション £5,000/年、または Enterprise）
  - ライセンスキーなしでは CheerpJ の表示領域に非商用ライセンスの文言が出る
  - 「就職用ポートフォリオ」に当たるかは明記なし（個人が自分の名前で公開するものは Community と読めるが、確認は未確認）
- javac: CheerpJ 自体は javac を含まない。JavaFiddle（Apache-2.0、Leaning Technologies 製）は Java 8 の `tools.jar`（リポジトリ内 18.3MB）を置き、`com.sun.tools.javac.Main` を CheerpJ で実行している。Java 11 以降の javac を CheerpJ で動かせるかは未確認
- オフライン: 無料枠は CDN 必須なので、PWA でのオフライン対応はライセンス上できない（Service Worker で CDN の応答をキャッシュしてよいかは未確認）
- 「第三者のサーバーに依存しない」という条件にも反する（CDN が止まると動かない）

### 1-3. その他

- GraalVM Web Image: 公式ページで「実験的」と明記。javac を Wasm にしたデモ（https://graalvm.github.io/graalvm-demos/web-image/javac ）は「ソース → バイトコード」まで。できた .class を実行する手段はデモにない。Native Image は閉じた世界が前提で、実行時に作ったクラスを読み込めない（これは私の知識。Web Image での確認はしていない）
- Doppio: MIT。Java 8 の JVM を TypeScript で実装。最終更新 2022-12（GitHub）。Java 8 止まりで、保守もされていない
- TeaVM / J2CL / Bytecoder / GWT / JSweet: すべて「ビルド時に Java を JS/Wasm に変換する」ツール。ブラウザで javac を動かす部分がない（teavm-javac がそこを埋めたもの）
- JavaBox（個人ブログで紹介。OpenJDK Zero を Wasm に移植したと報告）: 詳細・ライセンスとも未確認
- Java のサブセット解釈系（JS 製）: 保守されている既製品は見つけられなかった（未確認）。自作はパーサ＋型チェック＋実行系が必要で、学習アプリの範囲を超える
- 外部実行 API
  - Piston の公開 API: 2024年の告知で「無制限の鍵は新規発行しない」「既存の鍵は 2025-01-01 に失効」、上限は毎秒5件（README の写しによる）。条件が変わりうる
  - Judge0: 本体は GPL-3.0。ホスト版の無料枠・規約は未確認
  - どちらも「止まるリスク・規約」の点で今回の条件に合わない

---

## 2. 実験（scratchpad で実施。~/java-study-tracker は変更していない）

- 場所: `scratchpad/java-in-browser/`
- 環境: Apple M1、macOS、Node 24.15.0、Chrome 158（ヘッドレス、scratchpad 内の一時プロファイル）、比較用に手元の JDK 25.0.5
- 配信: `python3 -m http.server 8765`（127.0.0.1 のみ）。終了後に停止済み。Chrome（9333 番）も停止済み

### 2-1. teavm-javac の手順

1. https://teavm.org/playground/4/ から compiler.wasm、compiler.wasm-runtime.js、2つの classlib を取得（sha256 は末尾に記載）
2. Node で `load(compiler.wasm)` → `createCompiler()` → `setSdk()` / `setTeaVMClasslib()` → `addSourceFile()` → `compile()` → `generateWebAssembly({ mainClass })` → できた wasm を `load()` して `exports.main([])`
3. 標準出力・標準エラーは `installImports` で `teavmConsole.putcharStdout/putcharStderr` を差し替えて受け取る
4. ブラウザ版: コンパイル用 Worker（compiler.wasm を常駐）と、実行用 Worker（毎回新規。時間切れで `terminate()`）に分けたテストページを作成
5. Service Worker で全ファイルを事前キャッシュ → HTTP サーバーを止めて再読み込み → コンパイル・実行

### 2-2. 結果（ブラウザ: Chrome 158）

| テスト                                                                | 結果                                                                | 時間（コンパイル＋実行の合計）    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------- |
| Hello（日本語・絵文字・標準エラー）                                   | 成功。文字化けなし                                                  | 1回目 796ms、2回目以降 455〜490ms |
| クラス・抽象クラス・record・sealed・switch 式・テキストブロック・配列 | 成功。JDK と出力が完全一致                                          | 606〜676ms                        |
| コレクション・ラムダ・Stream・Optional・PriorityQueue                 | 成功。ただし HashMap/HashSet の表示順が JDK と違う                  | 739〜814ms                        |
| String.format / printf / Math / 浮動小数の表示                        | `%e` 以外は一致。`%e` は例外。`new Random(42)` の値が JDK と違う    | 991ms                             |
| 例外（捕まえる・捕まえない）                                          | 捕まえる動作は正しい。メッセージが null になる（下記）              | 464ms                             |
| Scanner で標準入力（代替クラス使用）                                  | 成功（"3\n10 20 30\n花子" → `花子: 60`）                            | 508ms                             |
| コンパイルエラー                                                      | 行・列つきで取得（`Main.java:4:30 ';' expected`）。メッセージは英語 | 87ms                              |
| 無限ループ                                                            | 2秒で Worker を止めて「時間切れ」にできた                           | 2,450ms（打ち切り）               |
| 判定（テスト用クラスを一緒にコンパイル）                              | 成功（`RESULT 4/6`、わざと入れたバグを検出）                        | 491ms                             |
| オフライン（Service Worker、サーバー停止後）                          | 成功（`offline OK 6`）                                              | —                                 |

- 内訳の例（2回目以降）: Worker 内の準備 約80ms、javac 4〜50ms、TeaVM の Wasm 生成 360〜880ms、実行 10〜25ms
- 初回は compiler.wasm の読み込み約90ms（ローカル配信。実際の回線では約4.5MB のダウンロードが加わる）
- 13回連続でコンパイルしても問題なし（毎回 `createCompiler()` で新しいインスタンスを作成）

### 2-3. Node で見つかったこと

- Java 25 の文法: `instanceof Point(int x, _)`、`switch` のレコードパターン + `when`、`List.getFirst()/reversed()`、コンパクトソースファイル（`void main() { IO.println(...) }`）まで成功し、JDK と同じ出力
- その他の動作確認（JDK と同じ出力）: `Thread.sleep`、`Thread` の start/join、BigDecimal/BigInteger、LocalDate、正規表現、ローカル enum、`System.exit(3)`
- 計算速度: エラトステネスの篩（500万）が 38ms（JDK 17ms）、コレクション処理が 244ms（JDK 82ms）。JDK の 2〜3 倍遅いが、初学者の問題なら問題ない
- **Node では、同じ compiler.wasm で 2〜3 回目のコンパイル中に `RuntimeError: array element access out of bounds` で落ちることがあった**（新しい Compiler を作っても発生）。Chrome では 13 回連続で再現せず。原因は未確認。対策: コンパイル用 Worker が落ちたら作り直して 1 回だけやり直す（テストページに実装済み）。CI で Node を使うなら問題ごとに別プロセスにする

### 2-4. JDK との違い（問題を作るときの注意）

| 違い                     | JDK                                                                 | teavm-javac                                                                                                | 対策                                                                 |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `java.util.Scanner`      | ある                                                                | **ない**（javac が「シンボルが見つかりません」）                                                           | 自作の Scanner を用意（下記）                                        |
| `System.in` の読み込み   | できる                                                              | 例外になる                                                                                                 | Scanner の代替クラスで文字列から読む                                 |
| HashMap/HashSet の表示順 | 実装依存の順                                                        | 別の順                                                                                                     | 出力を比べる問題では TreeMap・LinkedHashMap・並べ替えを使う          |
| `new Random(42)` の値    | 決まった列                                                          | 別の列                                                                                                     | 乱数の結果を判定に使わない                                           |
| 例外メッセージ           | `Index 5 out of bounds for length 3`、`/ by zero`、NPE の詳しい説明 | null（`NumberFormatException` は文言が違う）                                                               | 判定で例外メッセージを比べない。例外の「型」で判定する               |
| `String.format("%e")`    | 使える                                                              | 例外（Unknown format conversion）                                                                          | 問題で使わない                                                       |
| 捕まえない例外の表示     | `Exception in thread "main" ...` + 行番号                           | 自前のラッパーで同じ形に出せる。行番号は deobfuscator.wasm を入れると出る。末尾に TeaVM 内部の行が数行付く | 内部の行（`org.teavm.` で始まる行）を表示前に消す                    |
| StackOverflowError       | catch できる                                                        | JS の `RangeError` になり、catch できずに止まる                                                            | 実行側で RangeError を「StackOverflowError（再帰が深すぎる）」と表示 |
| 終了の検出               | —                                                                   | `Thread.sleep` などがあると `main()` が途中で JS に戻る                                                    | ラッパーの最後で `System.exit(0)` を呼び、`onExit` で終了を検出する  |
| javac のメッセージ       | 日本語（手元の環境では）                                            | 英語                                                                                                       | そのまま表示し、「チャットに質問」機能で補う                         |

### 2-5. Scanner の代替（実測で成功）

- `java.util` パッケージに自作クラスを足すと、javac が「package exists in another module: java.base」で拒否する
- 成功した方法
  1. 自作の `java.util.Scanner` と `java.util.InputMismatchException` を、手元の JDK で `javac --patch-module java.base=src/java.base` してコンパイル
  2. その .class を `compile-classlib-teavm.bin`（gzip された「名前の長さ2バイト・名前・データの長さ4バイト・データ」の並び）の末尾に足す（javac 用）
  3. 同じ .class を `addClassFile()` で渡す（TeaVM 用）
  4. 実行用のラッパークラスで `java.util.Scanner.setInput("…")` を呼んでから学習者の `main` を呼ぶ
- 実装した範囲: `next / nextInt / nextLong / nextDouble / nextBoolean / nextLine / hasNext / hasNextInt / hasNextLine / close`。足りないものは必要になってから追加

### 2-6. CheerpJ（JavaFiddle）の参考計測

- https://javafiddle.leaningtech.com/ を同じヘッドレス Chrome で開き、既定の Hello World を「Run」
- 配信されていたのは CheerpJ 4.3、Java 8 の JRE（`/4.3/8/jre/lib/rt.jar`）
- 初回: 表示まで 5.7〜9.2 秒、通信量 約22MB（約175リクエスト）
- 2回目以降: 約1.25 秒
- teavm-javac（初回 0.8 秒＋ダウンロード 4.5MB、2回目以降 0.5 秒前後）より重い

---

## 3. 判定（テスト）のやり方

- A. 出力の比較: 学習者の `main` の標準出力を期待値と比べる。行末の空白と最後の改行は無視する
  - 標準入力つきの問題は、Scanner の代替クラスに入力を渡す
- B. テスト用コードを一緒にコンパイル: `JudgeMain` などのクラスで学習者のメソッドを呼び、`PASS/FAIL` を出力する（実測で成功）
  - メソッド単位で判定でき、失敗したケースの期待値と実際の値を表示できる
  - JUnit はクラスライブラリに含まれないため、小さな自作の判定クラスで足りる（JUnit が動くかは未確認）
- 問題データの品質チェック（提案）: CI で各問題の模範解答を「手元と同じ JDK」と「teavm-javac（Node）」の両方で実行し、出力が一致することを確かめる。上の「JDK との違い」に当たる問題を自動で見つけられる
- 注意: 静的サイトなので、テストコードと期待値は利用者から見える。利用者は本人1人なので問題ない

## 4. アプリに組み込むときの要点（推奨案の場合）

- ファイルは `public/java/` などに置いてリポジトリに入れる（teavm.org から毎回取得しない）。取得元のバージョンと sha256 を記録する
  - 今回は teavm.org/playground/4/ の配布物を使った。`./gradlew :compiler:build` で自分でビルドする方法（Java 21 が必要）は README にあるが、今回は試していない
  - なお https://teavm.org/playground/compiler.wasm（README が案内する場所）は 2025-06-15 更新の古いもので、/playground/4/ の方が新しい
- Worker を2つに分ける
  - コンパイル用: compiler.wasm を常駐させる。落ちたら作り直す
  - 実行用: 毎回新規。時間切れ（例: 3〜5秒）で `terminate()`。出力の量にも上限をつける
- PWA: 全ファイルを事前キャッシュする。vite-plugin-pwa（Workbox）は既定で 2MiB を超えるファイルをキャッシュしないので、上限を上げる設定が必要（例: 8MB）。初回だけ約4.5MB 落とす旨を画面に出す
- `.wasm` の MIME が `application/wasm` でないと `compileStreaming` が失敗する。GitHub Pages の MIME は未確認 → 取得した ArrayBuffer を `load()` に渡す形にすれば MIME に依存しない（ランタイムは文字列以外を渡すと `WebAssembly.compile` を使う）
- 古いブラウザ（WasmGC 非対応）では「このブラウザでは実行できません。手元の JDK で実行してください」と表示する

## 5. どれも使えない場合の代替

- 実行しない問題形式（ブラウザだけで完結）
  - 出力予想（コードを読んで出力を選ぶ・入力する）
  - 穴埋め（空欄に入るトークンを選ぶ・入力する。文字列比較で判定）
  - 並べ替え（行の順番を正しくする）
  - バグ探し（間違っている行を選ぶ）
  - これらの正解は、問題作成時に手元の JDK で実行して確定させる（CI で自動化できる）
- 書く問題は手元の JDK
  - アプリから `Main.java` と判定用クラスをダウンロード（またはコピー）→ VS Code で `java Main.java`（単一ファイル実行）→ 出力を貼り付けてアプリで判定
- 推奨案を採る場合も、teavm-javac が使えないブラウザ向けにこの形を残す

---

## 6. 推奨案・次点・採用しない案

### 推奨案: teavm-javac を自前配信

- 理由
  - 無料・Apache-2.0。外部サーバーに依存しない（ファイルを自分のリポジトリに置ける）
  - オフライン（PWA）で動くことを実測で確認
  - Java 25 の文法まで使え、手元の JDK 25 と学ぶ内容がずれない
  - 速い（2回目以降 0.5 秒前後）、軽い（約4.5MB）
  - 判定（出力比較・テスト用クラス）の両方が動いた
- 残るリスク
  - 作者1人のプロジェクト → ファイルを固定して持てば、止まっても動く
  - JDK との違い（2-4 の表）→ 問題の作り方と CI の比較チェックで防ぐ
  - Node での不定期なクラッシュ（原因未確認）→ Worker の作り直し・CI は問題ごとに別プロセス
  - OpenJDK 部分のライセンス表記（GPLv2+CE）→ ライセンス画面と README に記載

### 次点: CheerpJ（JavaFiddle 方式）

- 本物の JVM なので、JDK との違いがほぼない（HashMap の順番・例外メッセージも JDK と同じはず。ただし今回は未検証）
- ただし、無料枠は CDN 必須でオフライン不可、表記必須、JavaFiddle の javac は Java 8、初回が重い（5.7〜9.2 秒・約22MB）
- teavm-javac が将来使えなくなったときの乗り換え先として残す

### 採用しない案と理由

- GraalVM Web Image: 実験的。javac は動くが、できたクラスを実行できない
- Doppio: Java 8 止まり、2022年から更新なし
- TeaVM / J2CL / Bytecoder / GWT / JSweet 単体: ブラウザで javac を動かせない
- 自作インタプリタ（Java のサブセット）: 作る量が大きく、本物の Java とずれる
- OpenJDK の Wasm 移植（個人プロジェクト）: 情報が少なく未確認
- 外部実行 API（Judge0、Piston など）: 条件（外部サーバーに依存しない・止まるリスク・規約）に反する。オフライン不可

---

## 付録

### 使ったファイルの sha256（teavm.org/playground/4/、2026-11-27 取得）

- compiler.wasm: `f266a67498ca3ac190be2c447e509ca132494feac5061c4c7e8ddc8fc12c6cbd`
- compiler.wasm-runtime.js: `82975b5e1ee8b97e563974b7906578892a12b1d6c9d7666b93e808884c7ecf91`
- compile-classlib-teavm.bin: `b97852e0294463ad1ab4854391b92d74bed421e8af34e024c9ee803d385a73c9`
- runtime-classlib-teavm.bin: `9527cbab986c4f87cd64eb9eeaa73b44aa035484548103a4df18cea172e8138b`
- deobfuscator.wasm（Maven `teavm-wasm-gc-deobfuscator-0.17.0.jar` 内）: `c471d927a3d049f1b3717d467d3ca1fc960e962c32d8ba75d99ccbb5e3761bf1`

### 実験ファイル（scratchpad 内。セッション終了で消える可能性あり）

- `scripts/run-teavm.mjs`・`run-teavm-tree.mjs`: Node でコンパイル・実行
- `scripts/bench-*.mjs`: 繰り返しコンパイルの計測
- `scripts/browser-test.mjs`・`offline-test.mjs`・`cdp.mjs`: ヘッドレス Chrome の操作
- `scripts/patch-sdk.py`: classlib に Scanner の代替クラスを追加
- `web/`: テストページ（`index.html`、`compile-worker.js`、`run-worker.js`、`sw.js`）
- `shim/src/java.base/java/util/Scanner.java`: Scanner の代替クラス
- `cases/`: テスト用の Java コード、`jdk-out/`・`teavm-out/`: 両者の出力

### 参照した情報源

- teavm-javac: https://github.com/konsoletyper/teavm-javac
- TeaVM: https://github.com/konsoletyper/teavm 、Playground https://teavm.org/playground.html
- CheerpJ ライセンス: https://cheerpj.com/licensing/ 、https://cheerpj.com/docs/licensing
- CheerpJ 概要: https://cheerpj.com/docs/overview
- JavaFiddle: https://github.com/leaningtech/javafiddle 、https://javafiddle.leaningtech.com/
- GraalVM Web Image: https://www.graalvm.org/dev/reference-manual/web-image/ 、javac デモ https://graalvm.github.io/graalvm-demos/web-image/javac
- Doppio: https://github.com/plasma-umass/doppio
- WebAssembly の対応状況: https://github.com/WebAssembly/website/blob/main/features.json
- Piston: https://github.com/engineer-man/piston
- JavaBox（個人ブログ）: https://bmarti44.substack.com/p/i-put-a-full-jvm-inside-a-browser

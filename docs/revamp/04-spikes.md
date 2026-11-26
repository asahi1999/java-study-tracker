# フェーズ0 確認（スパイク）の結果

- 実施: 2026-11-27（技術検証の担当）
- 対象: [03-design.md](03-design.md) 13章のフェーズ0と、15章の未確認のうち実装前に要るもの
- 場所: scratchpad の `spikes/`（下の「実験ファイル」）。リポジトリは本書の作成以外は変更していない
- 表記: 「動いた」= 実測で確かめた。「未確認」= 確かめていない（推測で「動く」とは書かない）

## 環境

- Mac（darwin-arm64）、macOS 15.1.1、Node 24.15.0、JDK 25.0.5（Temurin）
- Chrome 158.0.8127.88（インストール済みの Google Chrome をヘッドレスで。Playwright の `channel: 'chrome'`）
- `@playwright/test` 1.65.1 の Chromium 159.0.8154.6、WebKit 27.2（Playwright webkit v2388）
- teavm-javac: research と同じ teavm.org/playground/4 の配布物（sha256 は research の付録と一致することを確認）
- 配信: 自作の静的サーバー（127.0.0.1:4318）と `vite preview`（127.0.0.1:4317）。終了後に両方止めた。ブラウザの一時プロファイルは scratchpad 内（終了後に空を確認）

## 結論（先に）

| #   | 項目                               | 結果                                                                                                                                                                      | 設計への影響（要点）                                                                          |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | teavm-javac がブラウザで動くか     | Chrome 158: **動いた**。WebKit 27.2: **動いた**。利用者の Safari: **未確認**（インストール済みは 18.1.1。WasmGC は 18.2 からなので動かない見込み）                        | 利用者に Safari の更新か Chrome の利用を案内。WebKit では例外の行番号が出ない                 |
| 2   | Playwright WebKit（CI の E2E）     | macOS 上では **動いた**。CI（ubuntu）の WebKit は **未確認**                                                                                                              | 12-2 は WebKit を残してよい。ただし Linux で一度流して確かめる                                |
| 3   | vite-plugin-pwa 2.0.0 + Vite 8.3.8 | **動いた**（ビルド・SW 登録・オフラインで再読み込み）                                                                                                                     | 初回訪問では teavm のファイルがキャッシュされない → `clientsClaim: true` で解決（実測）       |
| 4   | CodeMirror の Java 25 の色付け     | **一部崩れる**（コンパクトソース・record パターン・switch のパターンで構文木にエラーの節。見た目はおおむね色が付く）                                                      | 「エラーの節が出ない」の試験は通らない。試験の基準を変える。`record` などに色を足す設定が要る |
| 5   | CSP（`unsafe-eval` なし）          | `<meta>` の CSP: **動いた**。ヘッダーの CSP（Worker にも効く）: **動かない** → 読み込み用 JS を直した版で **動いた**                                                      | GitHub Pages は `<meta>` しか使えず、`<meta>` は Worker に効かないので、元の JS のままでよい  |
| 6   | Worker と時間切れ、2回目以降の時間 | **動いた**。中央値 Chrome 0.47〜0.53秒、WebKit 0.62〜0.64秒                                                                                                               | フェーズ2の完了条件（中央値1.5秒以内）は満たせる見込み                                        |
| 7   | その他（15章）                     | GitHub Pages の `.wasm` の gzip: **gzip で返る**（他サイトで実測）。`JqCheck.java` の `class` 形: **動いた**。`setup-java` は v6 が最新。VS Code の重複クラス: **未確認** | 12-1 の action の版を直す                                                                     |

---

## 1. teavm-javac がブラウザで動くか

### 結果

- Chrome 158（ヘッドレス）: **動いた**
- Playwright の Chromium 159: **動いた**
- Playwright の WebKit 27.2: **動いた**。出力は Chrome と完全に一致（下の全ケース）
- 利用者の Mac の Safari: **未確認**
  - インストール済みの Safari は **18.1.1**（`/Applications/Safari.app` の版を読んだ）
  - research の表では WasmGC の対応は Safari 18.2 から → このままでは **動かない見込み**（実行はしていない）
  - Safari の自動操作（`safaridriver --enable`）は管理者権限が要るので行っていない
  - WebKit 27.2 で動いたことは、Safari 18.1.1 で動くことを意味しない（WebKit 27.2 は Safari 18.1 より新しい）。Safari 18.2 以上で動くかも **未確認**

### 手順

1. research のテストページを元に、設計（4-2）に合わせて作り直した
   - module Worker（`{ type: 'module' }`）を2つ: `compile.worker.js`（常駐）、`run.worker.js`（実行ごとに新規）
   - `compiler.wasm-runtime.js` は Worker から `import()`。`.wasm` と `.bin` は `fetch` → `ArrayBuffer` で渡す
   - 入口のクラスで `Scanner.setInput()` → 学習者の `main` → `System.exit(0)`（終了は `onExit` で検出）
2. Playwright のスクリプトで、各ブラウザに同じ順番でケースを流した（17回）
   - hello ×6、basics（クラス・record・sealed・switch 式・テキストブロック）×4、java25（`instanceof Point(int x, _)`、record パターン + `when`、`getFirst()`/`reversed()`）×3、コンパクトソースを外枠で包んだもの（4-5 の形 `import module java.base; final class Main {...}` を `new Main().main()` で呼ぶ）、Scanner の代わり、コンパイルエラー、無限ループ
3. 別に、例外のケース（捕まえない `ArithmeticException`、`StackOverflowError`）

### 計測値（コンパイル＋実行の合計。ページから見た時間）

| ブラウザ     | 1回目 | 2回目以降の hello（中央値） | 2回目以降の全ケース（中央値、時間切れを除く） | 最大            |
| ------------ | ----- | --------------------------- | --------------------------------------------- | --------------- |
| Chrome 158   | 898ms | 465ms                       | 529ms                                         | 697ms（basics） |
| Chromium 159 | 807ms | 463ms                       | 479ms                                         | 668ms           |
| WebKit 27.2  | 978ms | 615ms                       | 636ms                                         | 876ms（basics） |

- 内訳（2回目以降）: javac 5〜50ms、TeaVM の Wasm 生成 350〜720ms、実行 10〜35ms。Worker の準備（初回のみ）83〜107ms
- コンパイルエラー: 85〜91ms（`Main.java:4:30 ';' expected`、3ブラウザとも同じ）
- 1回目はローカル配信。実際の回線では約 4.5MB のダウンロードが加わる

### 見つかったこと

- **WebKit では、捕まえない例外のスタックトレースに行番号が出ない**
  - Chrome: `at Main.divide(Main.java:2)`、`at Main.main(Main.java:5)` まで出る（deobfuscator を使用）
  - WebKit: `Exception in thread "main" java.lang.ArithmeticException` の1行だけ
  - 原因の見込み: ランタイムが `Error.stack` を Chrome の形（`wasm-function[N]:0x...`）で読んでいる。WebKit の形は `Main::depth@wasm-function[89]` でオフセットが無い（コードを読んだ範囲。確定ではない）
- `StackOverflowError` は両方とも JS の `RangeError`（Chrome: `Maximum call stack size exceeded`、WebKit: 末尾に `.` が付く）。`name === 'RangeError'` で見分けられる
- `(Integer) o` の結果を使わないとき、`ClassCastException` が出ない（teavm-javac。Chrome・WebKit・Node で同じ。JDK は出る）。結果を使えば出る
- 無限ループの後も、コンパイル用 Worker はそのまま使えた

### 設計への影響

- 4-7: 実行時の例外の「12行目」は **ブラウザによって出ない**。行が取れないときは型だけを出す（15章の「取れなければ行は出さない」を、Safari では常にそうなる前提に）
- 4-7: スタックトレースから消す行に、`org.teavm.` に加えて入口のクラス（`JqRun` など）の行も入れる（Chrome で `at JstRunner.main(JstRunner.java:1)` が出た）
- 4-9 / 02-requirements.md N-BR-2: 利用者の Safari 18.1.1 は非対応の見込み。案内の文言に「macOS を更新して Safari 18.2 以上にする、または Chrome を使う」を入れる。フェーズ2の WasmGC 判定は、この Safari で `unsupported` になるかを利用者の手元で確かめる（未確認）
- 教材: `class-cast` の問題は、キャストの結果を使う書き方にする（6-9 の「JDK との違い」に1行足す）

---

## 2. Playwright WebKit で動くか（CI の E2E）

### 結果

- macOS 上の Playwright WebKit 27.2: **動いた**（1章の全ケース、2章の PWA、5章の CSP）
- CI（`ubuntu-latest`）の Playwright WebKit: **未確認**
  - Linux の WebKit は macOS と別のビルド。WasmGC が有効かは確かめていない
  - Docker で試そうとしたが、Docker のデーモンが止まっていたので行っていない

### 手順

- `npx playwright install chromium webkit`（WebKit 81MB をダウンロード）
- 1章と同じスクリプトを `webkit.launch()` で実行

### 設計への影響

- 12-2: WebKit は残してよい。ただしフェーズ2で CI に入れたとき、最初に Linux で teavm-javac が動くかを確かめる。動かなければ 12-2 の注記どおり「非対応の表示が出る」テストに変える
- WebKit では1回あたり Chrome より約 0.15 秒遅い。E2E の時間切れの値は余裕をもたせる

---

## 3. vite-plugin-pwa 2.0.0 と Vite 8.3

### 結果

- **動いた**
  - `tsc --noEmit && vite build` が通る。`sw.js`、`workbox-*.js`、`manifest.webmanifest` が出る。`index.html` に `<link rel="manifest">` が入る
  - Service Worker が登録される（scope `/java-study-tracker/`）
  - オフライン（`context.setOffline(true)`）で再読み込みしても画面が出る。teavm のファイル（計 7,575,342 バイト）もキャッシュから取れる
  - Chromium・WebKit の両方で同じ結果
- **ただし、設計の設定のままだと初回訪問で teavm のファイルがキャッシュされない**（下記）

### 手順

1. scratchpad に空の React 18.3.1 + Vite 8.3.8 + `@vitejs/plugin-react` 6.3.0 + vite-plugin-pwa 2.0.0（workbox-build 7.4.1）のプロジェクトを作成
2. 11-1 の `VitePWA({...})` をほぼそのまま写した（`registerType: 'prompt'`、`injectRegister: false`、`useRegisterSW` で登録、`globIgnores: ['java/**', ...]`、`/java/` は `CacheFirst`）
3. `public/java/teavm-javac/0.17.0-pg4/` に teavm-javac の5ファイルを置いた
4. `vite preview --port 4317` で配信し、Playwright で次を確かめた
   - 1回目の表示 → `navigator.serviceWorker.ready` → teavm の5ファイルを `fetch`
   - 再読み込み → もう一度 `fetch`
   - オフラインにして再読み込み → 画面と `fetch`

### 計測値・観察

| 時点                                       | ページが SW の制御下か | teavm のキャッシュ                |
| ------------------------------------------ | ---------------------- | --------------------------------- |
| 1回目（設計の設定のまま）                  | いいえ                 | **入らない**（SW を通らないため） |
| 2回目                                      | はい                   | 5ファイル入る                     |
| 3回目（オフライン）                        | はい                   | 取れる（11ms）                    |
| 1回目（`clientsClaim: true` を足した場合） | はい                   | 5ファイル入る                     |

- 事前キャッシュ: 8件 605KiB（大半は CodeMirror を含む JS 611KB。gzip 202KB）
- ビルドで「500kB を超えるチャンク」の警告が出る（CodeMirror を含めたため）
- `npm audit`: moderate が2件（workbox-build が使う `glob`・`minimatch`。ビルド時だけ使うもの）

### 設計への影響

- 11-1: `workbox` に `clientsClaim: true` を足す（実測で解決）
  - `registerType: 'prompt'` のまま。`skipWaiting` はしないので、更新時は「更新する」を押すまで古い SW のまま（この組み合わせでの更新の流れは今回は試していない。未確認）
- 4-10: 念のため `prepare()` は `navigator.serviceWorker.ready` を待ってから取得する（SW の有効化より先に取得するとキャッシュされない）
- 11-2: 「先読みで fetch したものがそのままキャッシュされる」は、上の2点を入れれば成り立つ
- 1章（画面）: エディタ（CodeMirror）は動的 `import()` で分ける（ホームの読み込みを軽く）
- `tsconfig` の `types` に `vite-plugin-pwa/react` が要る（`virtual:pwa-register/react` の型）
- Vite の最新は 8.4.0（npm）。今回試したのは 8.3.8 のみ

---

## 4. @codemirror/lang-java の Java 25 の色付け

### 結果

- **一部崩れる**。ただし見た目はおおむね色が付き、読めなくなるほどではない
- `@codemirror/lang-java` 6.0.2 / `@lezer/java` 1.2.1 で、機能ごとに構文木のエラーの節を数えた

| 書き方                                                       | 構文木     | 見た目（スクショ）                                                                                |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| コンパクトソース（トップレベルの `void main()`・フィールド） | エラーあり | `void`・`main` に色は付く。`IO.readln` などで色の付き方がばらつく。折りたたみの印が出ない行がある |
| `import module java.base;`                                   | OK         | OK                                                                                                |
| `record` 宣言                                                | OK         | **`record` に色が付かない**（キーワード扱いされていない）                                         |
| `instanceof` の型パターン（`o instanceof String s`）         | OK         | OK                                                                                                |
| `instanceof` の record パターン（`Point(int x, int y)`）     | エラーあり | 色はほぼ付く                                                                                      |
| `_`（record パターン内）                                     | エラーあり | 色はほぼ付く                                                                                      |
| `_`（for・catch・ラムダの引数）                              | OK         | OK                                                                                                |
| switch 式（矢印）・`yield`・`case null`                      | OK         | OK                                                                                                |
| switch の型パターン（`case Integer i ->`）                   | エラーあり | `case Circle c` の `c` は色が付く                                                                 |
| switch の record パターン・`when`                            | エラーあり | **`Point`・`when`・変数に色が付かない**                                                           |
| テキストブロック                                             | OK         | OK（中の `"` や日本語も文字列の色のまま）                                                         |
| `sealed` / `permits` / `non-sealed`                          | OK         | **`sealed`・`permits` に色が付かない**                                                            |
| `var`、ラムダ、メソッド参照、enum、ジェネリクス              | OK         | OK                                                                                                |

- 対策を試した: `javaLanguage.configure({ props: [styleTags({ 'record sealed permits': tags.definitionKeyword })] })` で `record`・`sealed`・`permits` に色が付いた（スクショで確認）
- `when` はパーサーが変数名として読むので、この方法では色を足せない

### 手順

1. 3章の PWA のプロジェクトに CodeMirror（`codemirror` 6.0.2 の `basicSetup` + `java()`）を入れ、見本を7つ表示
2. `syntaxTree(state).iterate` でエラーの節（`⚠`）を集めた
3. Chromium・WebKit で見本ごとにスクショ（`deviceScaleFactor: 2`）を撮って目で確認
4. Node で `@lezer/java` の `parser.parse()` を機能ごとに当て、エラーの節の有無を表にした（クラスの中に入れて、コンパクトソースの影響を外した）

### 設計への影響

- 15章の確かめ方「構文木にエラーの節が出ないかをテストで見る」は **通らない**。試験は「主な書き方で色が付く（スクショ・トークン）」に変える。または試験しない
- エディタの設定に、上の `styleTags` を足す（`record`・`sealed`・`permits`）
- 構文木に頼る機能（自動インデント、折りたたみ、構文木を使う lint）は、コンパクトソースや新しいパターンで崩れる前提にする。教材の「使ってよい文法」の検査（6-10）は CodeMirror の構文木を使わない（今の設計どおり簡易検査なら影響なし）
- 自動インデントの崩れは今回確かめていない（未確認）

---

## 5. CSP（`script-src 'self' 'wasm-unsafe-eval'`、`unsafe-eval` なし）

### 結果

| CSP の付け方                                                           | Chrome 158                                      | WebKit 27.2              |
| ---------------------------------------------------------------------- | ----------------------------------------------- | ------------------------ |
| ページの `<meta http-equiv>` だけ（Worker のレスポンスにヘッダーなし） | **動いた**                                      | **動いた**               |
| すべてのレスポンスにヘッダーで付ける（Worker にも効く）                | **動かない**（`EvalError`）                     | **動かない**             |
| ヘッダー + 読み込み用 JS を直した版                                    | **動いた**（全17ケースの出力が CSP なしと一致） | **動いた**（同じく一致） |

- 使った CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'`
- `<meta>` で動く理由: `<meta>` の CSP はそのページにだけ効き、ファイルから作った Worker には効かない（Worker はそれ自身のレスポンスヘッダーの CSP に従う）。今回の結果もそのとおりだった
- ヘッダーで動かない理由: `compiler.wasm-runtime.js` が `new Function` を使う
  - 読み込み時（`load()` の中）: 32個の関数を `new Function` で作る
  - コンパイラの準備時: JSO のクラス・メソッドを `new Function` で作る。さらに compiler.wasm の `@JSBody` の中身（14種、`return obj[__this__];` など）を `new Function` で作る

### 代わりの方法（試して動いたもの）

- 読み込み用 JS の `new Function` を、eval を使わない関数に置き換えた版を作った（`spikes/scripts/patch-noeval.py`）
  1. 引数の数だけ受け取って呼ぶ関数（`callFunction`・`callMethod`・`construct`・`arrayOf`・`defineMethod`・`defineFunction`・名前つきコンストラクタ）は、可変長引数のクロージャにした
  2. `@JSBody`（`createFunction`）は、compiler.wasm で実際に使われた14種を「引数名と本文」をキーにした表で返す。表に無いものだけ `new Function`（CSP では失敗）
  3. 結果の sha256: `6a4664a169b1b88560b84711fa2b1eae099af8533d26d682fda63fb8eab9822b`（元: `82975b5e…`）
- 学習者のプログラム（app.wasm）の実行でも、この表の外の `@JSBody` は使われなかった（今回のケースの範囲。全部の標準ライブラリで足りるかは未確認）

### 設計への影響

- GitHub Pages は HTTP ヘッダーを付けられないので、CSP は `<meta>` しか使えない → **teavm-javac の JS は直さずに使える**（推奨）
  - `<meta>` に `worker-src 'self'` を入れる
  - CSP は Worker の中を守らない、と設計に書く（Worker はユーザーのコードを動かす場所なので、ここは許容する判断が要る）
- ヘッダーの CSP を付けられる配信先に移すなら、直した版を使う。ただし teavm-javac を更新するたびに直し直しになり、表の外の `@JSBody` が出ると動かない。保守の手間が大きいので、今は採らない
- 15章の「CSP（`eval` なし）で動くか」はフェーズ2から外してよい（済み）。フェーズ2の `#/dev/java` で `<meta>` を付けた状態の確認だけ残す

---

## 6. Web Worker 内での実行と時間切れ

### 結果

- **動いた**（Chrome 158・Chromium 159・WebKit 27.2）
  - コンパイル用 Worker を常駐、実行用 Worker を毎回新規に作る形で、17回連続して問題なし
  - 無限ループ（`while (true) { i++; }`）: 2,000ms のタイマーで `terminate()` → 2,001〜2,002ms で「時間切れ」を返した。画面（メインスレッド）は止まらない
  - 時間切れの後の実行も普通に動いた（コンパイル用 Worker は作り直していない）
  - コンパイラ内部のエラー（`RuntimeError`）は今回1回も起きなかった（やり直し `retried=0`）

### 計測値（2回目以降、コンパイル＋実行、中央値）

| ブラウザ     | hello        | 全ケース（時間切れを除く） |
| ------------ | ------------ | -------------------------- |
| Chrome 158   | 465ms（n=6） | 529ms（n=15、464〜697ms）  |
| Chromium 159 | 463ms（n=6） | 479ms（n=14、445〜668ms）  |
| WebKit 27.2  | 615ms（n=6） | 636ms（n=15、598〜876ms）  |

- 実行用 Worker の起動と app.wasm の読み込み・実行: 9〜35ms
- 無限ループ: ページから見て 2,439〜2,543ms（コンパイル約 440〜540ms + 待ち 2,000ms）

### 設計への影響

- 4-2・4-4 の設計どおりでよい
- フェーズ2の完了条件「2回目の実行が中央値 1.5 秒以内」は、この Mac では満たせる。遅い PC では未確認

---

## 7. 15章のほかの項目

### 7-1. GitHub Pages が大きな `.wasm` を gzip で返すか

- 結果: **gzip で返る**（自分の URL ではなく、他の github.io のサイトで確認）
- 手順: `curl -sI -H 'Accept-Encoding: gzip' https://kripken.github.io/sql.js/dist/sql-wasm.wasm`
- 計測値: 元 1,450,157 バイト → gzip 508,708 バイト。`content-type: application/wasm`、`server: GitHub.com`、`cache-control: max-age=600`
- 設計への影響
  - 11-2・research の「未確認」を解消。compiler.wasm（4.86MB）も gzip で約 1.83MB になる見込み（自分の URL では公開後に確かめる）
  - `Content-Length` は gzip 後の大きさになる → 4-10 の `manifest.json` で大きさを持つ設計のままでよい
  - `.bin`（`application/octet-stream`）が gzip されるかは未確認。ただし中身がすでに gzip なので影響は小さい

### 7-2. `JqCheck.java` の `class` 形（5-6）

- 結果: **動いた**（JDK 25.0.5、`java JqCheck.java`）
- 手順: 1ファイルに「学習者の `import` → `class JqCheck { main → JqRun.main }` → `public class Main {...}` → `final class JqRun {...}`」を並べた
- 観察
  - 最初のクラス `JqCheck` が動き、`public class Main` があってもファイル名のエラーは出ない
  - 同じフォルダに別の `Main.java`（違う中身）があっても、ファイル内の `Main` が使われた
  - 判定の行（`\u001E@@jq ...`）は標準エラーにそのまま出る。終了コード 0
  - 対照の `compact` 形（`import module java.base;` + `final class Main { void main() }`）も動いた
- 設計への影響: 5-6・15章の「フェーズ1で確かめる」は済み

### 7-3. `actions/setup-java` の最新版と `java-version-file`

- 結果
  - 最新版（GitHub の releases、2026-11-27 時点）: `actions/setup-java` **v6.3.0**、`actions/checkout` v7.0.1、`actions/setup-node` v7.1.0、`actions/cache` **v6.1.0**
  - setup-java の README: v1〜v4 は非推奨。`java-version-file` は `.java-version`・`.tool-versions`・`.sdkmanrc` に対応
  - `java/JDK_VERSION` のような名前: setup-java v6.3.0 のソース（`src/util.ts` の `getVersionFromFileContent`）では、ファイル名が `.tool-versions`・`.sdkmanrc` 以外なら `.java-version` の形（数字で始まる最初の語）として読む → `25.0.5` と書けば読める **はず**。GitHub Actions で実際に動かしてはいない（未確認）
  - Temurin の 25 系の最新は `25.0.5.1+2`（Adoptium の API）。`25.0.5` を指定したとき、どれが入るかは未確認
- 設計への影響
  - 12-1: `actions/setup-java@v5` → `@v6`、`actions/cache@v4` → `@v6` に直す
  - `java-version-file: java/JDK_VERSION` のままでよい。フェーズ1の最初の CI で、ログの Java の版を確かめる

### 7-4. VS Code の Java 拡張が章ごとの同じ名前のクラスを重複エラーにするか

- 結果: **未確認**
- 分かったこと: 手元の VS Code には Extension Pack for Java（`redhat.java` ほか）が入っている
- 確かめていない理由: VS Code を画面で開いて Problems を見る必要があり、自動ではできなかった
- 設計への影響: なし（15章のとおりフェーズ5で確かめる）

### 7-5. 今回やっていないもの

- WasmGC 判定用の最小モジュール（フェーズ2）
- vite-plugin-pwa の更新の流れ（新しい版を出して「更新する」を押す）
- Firefox（15章の表にあるが、今回の依頼の範囲外）

---

## 設計の修正提案（まとめ役へ）

| 章          | 今                                      | 直す案                                                                                              | 根拠        |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| 4-7         | 実行時の例外を「◯行目」と出す           | 行は取れたときだけ。Safari/WebKit では型だけ                                                        | 1章         |
| 4-7         | `org.teavm.` の行を消す                 | 入口のクラス（`JqRun` など）の行も消す                                                              | 1章         |
| 4-9・N-BR-2 | 非対応の案内                            | 「macOS を更新して Safari 18.2 以上、または Chrome」と書く。利用者の Safari 18.1.1 は非対応の見込み | 1章         |
| 4-10        | 先読みで `prepare()`                    | SW の `ready` を待ってから取得                                                                      | 3章         |
| 11-1        | `workbox` の設定                        | `clientsClaim: true` を足す                                                                         | 3章（実測） |
| 1章・2章    | エディタ                                | CodeMirror を動的 `import()` で分ける。`record`・`sealed`・`permits` に色を足す `styleTags`         | 3章・4章    |
| 12-1        | `setup-java@v5`、`cache@v4`             | `@v6`、`@v6`                                                                                        | 7-3         |
| 12-2        | WebKit で E2E                           | 残す。Linux の WebKit で動くかを最初に確かめる                                                      | 2章         |
| 15章        | CSP をフェーズ2で確かめる               | `<meta>` で動くことは確認済み。`worker-src 'self'` を入れ、CSP が Worker に効かないことを書く       | 5章         |
| 15章        | CodeMirror の試験「エラーの節が出ない」 | 基準を変える（エラーの節は出る）                                                                    | 4章         |
| 15章        | gzip・`JqCheck` の `class` 形           | 済みにする                                                                                          | 7-1・7-2    |
| 6-9         | JDK との違いの表                        | 「使わないキャストでは `ClassCastException` が出ない」を足す                                        | 1章         |

## 残っている未確認

- 利用者の Mac の Safari（18.1.1）で動くか。Safari 18.2 以上で動くか
- CI（ubuntu）の Playwright WebKit で動くか
- `java-version-file: java/JDK_VERSION` を GitHub Actions で実際に読めるか。`25.0.5` でどの Temurin が入るか
- VS Code の Java 拡張の重複クラス
- `registerType: 'prompt'` + `clientsClaim: true` での更新の流れ
- 遅い PC での実行時間
- 読み込み用 JS を直した版で、表の外の `@JSBody` が必要になる標準ライブラリがあるか（採らないなら不要）

## 実験ファイル（scratchpad。セッション終了で消える可能性あり）

- 場所: `scratchpad/spikes/`
- `teavm/site/`: テストページ（`index.html`、`csp-meta.html`、`main.js`、`compile.worker.js`、`run.worker.js`、`assets/`）。`?rt=compiler.wasm-runtime.noeval.js` で直した版を使う
- `teavm/cases/`: Java のケース（research のものに `compact-wrapped`・`stackoverflow`・`uncaught`・`cce` を追加）
- `teavm/log-*.txt`: 各ブラウザの結果（`log-chrome.txt`、`log-webkit.txt`、`log-noeval-*.txt` など）
- `server.mjs`: 静的サーバー（`/h/` で始まるパスに CSP ヘッダーを付ける）
- `pw/teavm-run.mjs`・`pwa-run.mjs`・`cm-shot.mjs`: Playwright のスクリプト
- `scripts/patch-noeval.py`: 読み込み用 JS の `new Function` を置き換える。`scripts/lezer-check.mjs`: lezer-java の構文木の確認
- `pwa/`: Vite 8.3.8 + React + vite-plugin-pwa 2.0.0 + CodeMirror のプロジェクト
- `shots/`: CodeMirror のスクショ（`cm-<ブラウザ>-<見本>[-patch].png`、全体 `codemirror-*.png`）
- `jqcheck/`: `JqCheck.java` の `class` 形・`compact` 形

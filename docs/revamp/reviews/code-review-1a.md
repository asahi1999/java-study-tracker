# コードレビュー: フェーズ1a（Java と教材の土台）

- 作成: 2026-11-27（コードレビュー役）
- 対象: revamp ブランチのコミット 459cf3a・5106c14・432c211・d2149a6（`git diff 04f6358..d2149a6`）
- 照合したもの: [03-design.md](../03-design.md)（第2版）、[06-impl-notes.md](../06-impl-notes.md)、[02-requirements.md](../02-requirements.md) の N-SEC、research の付録（SHA256）
- 確かめ方: コミット済みの中身を `git archive d2149a6` で scratchpad に展開して動かした（作業ツリーは触っていない）
  - `npm run typecheck`・`eslint .`・`prettier --check .`・Vitest（関係するフォルダ 21ファイル 177件）・`test:teavm`（14件）はすべて通った
  - 下の「再現」は、その展開先に足した使い捨てのテスト・スクリプトの結果（リポジトリには入れていない）
- 重要度
  - **高** = 画面の担当が使い始める前に直す
  - **中** = フェーズ2 に入る前に直す
  - **低** = 気づいたときに直せばよい。好みの問題もここ
- 「（自信がない）」= 確かめていない。確かめ方を書く

---

## 0. まとめ

- 高 2件、中 4件、低 17件
- 全体の作りは設計どおりで、設計から変えた点も 06-impl-notes.md に理由つきで書かれている。テストも「落ちるべきものが落ちる」（わざと壊した教材 9種）まで入っていて、よくできている
- 大きな問題は次の2つ
  1. 学習者の Java から `@JSBody` で JavaScript を実行できる。run.worker の中で `fetch`・IndexedDB に届く（N-SEC-3 に反する）（H-1）
  2. compile.worker を作り直すときに準備が失敗すると、`run()` の Promise が reject する（`RunResult` を返す約束が破れ、画面が「実行中」のまま止まる）（H-2）

---

## 1. 高

### H-1. 学習者のコードから `@JSBody` で JavaScript を実行できる（N-SEC-3 違反）

- ファイルと行
  - `src/runtime/java/core/compile.ts` 43行（`setSdk` に同梱の `compile-classlib-teavm.bin` をそのまま渡す）
  - `src/runtime/java/compile.worker.ts` 70〜74行
  - `src/domain/java/precheck.ts`（この種の検査が無い）
- 問題
  - javac が見る `compile-classlib-teavm.bin` に `org/teavm/jso/**`（`JSBody` など 377件）が入っている。学習者が `@JSBody(script = "...")` を書くと、そのままコンパイル・実行される
  - run.worker の中では `fetch`・`self.postMessage`・IndexedDB（同じオリジン。アプリの記録の DB）に届く。Worker には `<meta>` の CSP が効かない（11-4）ので、外への通信も止まらない
  - 02-requirements.md N-SEC-3「学習者の Java から JavaScript を呼ぶ口（JSO など）は渡さない。外部への通信はできない」と、11-4 の「Worker の中は JS を呼ぶ口を渡さないことで守る」が成り立っていない
  - 利用者は本人1人だが、チャットやネットから貼ったコードがそのまま動く経路になる
- 再現
  - classlib の中身: `compile-classlib-teavm.bin` を展開すると 1,591件のうち `org/teavm/jso/` が 377件（`JSBody.class`・`JSObject.class` など）
  - 次のコードを `runTeavmIsolated`（content-verify と同じ経路）で動かすと、`judged` で `js:function/undefined/object` が出た（Node の Worker スレッド。`fetch` が関数として見える）

    ```java
    import org.teavm.jso.JSBody;
    @JSBody(script = "return String(typeof fetch) + '/' + String(typeof self) + '/' + String(typeof globalThis.process);")
    static native String probe();
    void main() {
        System.out.println("js:" + probe());
    }
    ```

- 直し方
  - 本筋: javac に見せる SDK から `org/teavm/**` を除く。フェーズ2 の `classlib-patch.ts` が `compile-classlib-teavm.jq.bin` を作り直すので、そこで `org/teavm/` で始まる項目を落とす（TeaVM 側の `runtime-classlib` はそのまま）。除いてもハーネスと標準ライブラリのコンパイルが通るかは未確認（自信がない。`test:teavm` と content-verify で確かめる）
  - フェーズ2 までのつなぎ: 事前の検査（`precheck.ts`）で、学習者のファイルに `org.teavm`（`\borg\s*\.\s*teavm\b`）があれば止める。`org` のような Unicode エスケープで逃げられるので、検査の前に `\uXXXX` を元の文字に戻す
  - テスト: `test:teavm` に「`@JSBody` を書いたコードはコンパイルエラーになる（または事前の検査で止まる）」を1本足す

### H-2. 作り直しのときに準備が失敗すると、`run()` が reject する

- ファイルと行: `src/runtime/java/teavmRunner.ts` 226〜247行（`compile()` の中の `await ensureReady()` 231行・234行）、356〜363行
- 問題
  - `run()` は最初の `ensureReady()` だけを try/catch で囲んでいる。`compile()` の中で呼ぶ `ensureReady()`（50回ごとの作り直し、内部のエラーのあとのやり直し）が失敗すると、例外がそのまま `run()` の外に出る
  - `JavaRunner.run` は必ず `RunResult` を返す約束（`internal-error` がある）。画面は reject を想定しないので、「実行中」の表示のまま止まる。未処理の reject も出る
  - 起きやすいのは、内部のエラー（Wasm の `RuntimeError`。メモリ不足のことが多い）のあとのやり直しで、新しい Worker の読み込みも失敗するとき、オフラインでキャッシュが無いときなど
- 再現: 偽の Worker（`teavmRunner.test.ts` と同じ作り）で確かめた
  - `recycleAfter: 1`、2つ目の compile.worker は `init-failed` → 2回目の `run()` が **reject**（`offline`）。`status` は `failed`
  - 1回目のコンパイルが `internal-error`、作り直した compile.worker が `init-failed` → `run()` が **reject**
- 直し方
  - `compile()` の中の `ensureReady()` を try/catch で囲み、失敗したら `{ kind: 'internal-error', message: 'Java の実行環境を準備できない: …' }` を返す。または `run()` の本体全体を try/catch で囲み、想定外の例外は `internal-error` にする（どちらか1か所で足りる）
  - `teavmRunner.test.ts` に上の2本を足す

---

## 2. 中

### M-1. コンパクトソースで `void main(String[] args)` と書くと、判定のファイルのエラーになる

- ファイルと行: `src/domain/java/harness.ts` 61〜62行（`JqEntry` は `new Main().main();` だけ）、`src/domain/java/precheck.ts` 15〜18行
- 問題
  - JDK 25 のコンパクトソースは、引数ありの `void main(String[] args)` も正しい形。チャットや本からもらったコードでよく出る
  - 今は `JqEntry.java` のコンパイルエラーになり、`origin: 'harness'` で「method main in class Main cannot be applied to given types」が出る。4-7 の表では「判定用のコードでエラー。教材の不具合かもしれません」に落ち、学習者は直し方が分からない。手元の JDK では動くので、食い違いにも見える
  - 設計（5-2 の `JqEntry` の行）にも無い穴
- 再現: JDK で `void main(String[] args) {\n    System.out.println("hi");\n}` を動かすと `compile-error`、`file: 'JqEntry.java'`、`origin: 'harness'`
- 直し方（どれか）
  - `assembleSources` で、コメントと文字列を消したソースに一番外の `void main\s*\(\s*String` があれば、`JqEntry` を `new Main().main(new String[0]);` にする（簡単）
  - 事前の検査で止め、「`void main()` の形で書きます。`(String[] args)` を消してください」と出す（設計の方針に近い）
  - テスト: `harness.test.ts` か `precheck.test.ts` と、JDK・teavm の両方で通ることを `test:teavm` に1本

### M-2. `runtime: local` の問題も teavm で動かして比べる

- ファイルと行: `scripts/content-verify.ts` 68〜73行（`runAll`）・339行（`engines` は問題によらず `['jdk', 'teavm']`）
- 問題
  - 6-2 の `runtime: local` は「ブラウザでは動かさない（手元で実行のみ）」。6-9 の「ブラウザで使わない書き方」も `runtime: browser` のときだけ
  - 今は local の問題でも teavm でコンパイル・実行し、JDK との一致まで求める。teavm で動かないから local にした問題（`Scanner` を多く使う、`HashMap` の順番に頼る など）は、必ず NG になる
- 直し方: `verifyProblem` で `f.runtime === 'local'` なら `engines` を `['jdk']` にする。`tests/content-fixtures/good` に local の見本を1つ足す

### M-3. ハーネス（Java）の正規化と JSON のエスケープを、Java 側で確かめていない

- ファイルと行: `java/harness/JqText.java` 9〜35行、`java/harness/JqProtocol.java` 44〜70行。テストは `src/domain/java/text.test.ts`（TS 側だけ）と、`runtime-core.teavm.test.ts` の絵文字の1本だけ
- 問題
  - 14章の「ハーネス（Java）: `JqText.normalize`、JSON のエスケープ（改行・引用符・制御文字・絵文字）」がテストに無い。06-impl-notes.md にも「フェーズ2 に回した」とは書かれていない
  - `JqText.normalize`（判定に使う）と `normalizeOutput`（予想問題・content-verify の predict に使う）は同じ決まりのはずだが、同じ入力で同じ結果になることを確かめていない
  - `JqProtocol.quote` は手書きの JSON。`"`・`\`・制御文字・U+2028・サロゲートペアの片方だけ、を含む `actual` が `JSON.parse` で元に戻ることを確かめていない（コードを読んだ限りでは正しい）
- 直し方
  - `java/test-vectors/normalize.json`（入力と正規化の結果の組）を作り、Vitest（TS）と `test:teavm` の JDK・teavm の両方で確かめる
  - `test:teavm` に「学習者が上の文字を出したとき、`case.actual` が元の文字列に戻る」を1本（JDK と teavm の両方）

### M-4. `expectError` と wrong の宣言の図鑑 ID が、種類（compile・runtime）と合っているかを見ていない

- ファイルと行: `scripts/lib/content.ts` 787〜797行
- 問題
  - `expectError.kind: exception` の `dex` が `kind: runtime` の項目か、`type` がその項目の `match.exception` に入っているかを見ていない。`dex: arithmetic`、`type: java.lang.NumberFormatException` のような食い違いが content-build も content-verify も通る（content-verify は `type` だけを見る）
  - `kind: compile` の `dex` に runtime の項目を書いた場合は、content-verify で「当たらない」になるが、理由が分かりにくい（JDK が要る）
- 直し方: `checkReferences` で、compile の `dex` は `kind: compile`、exception の `dex` は `kind: runtime` で `type` が `match.exception` に入ること、を確かめる（JDK 不要なので content-build で落とせる）。`content.test.ts` に間違いの例を1つずつ

---

## 3. 低

### L-1. run.worker の出力の上限は、行の頭が U+001E の標準エラーを数えない（二重の守りが外せる）

- ファイルと行: `src/runtime/java/core/output.ts` 70〜71行
- 問題: 学習者が `System.err.print("\u001E" + …)` を改行なしで出し続けると、Worker 側では1文字も数えない。ハーネスの `JqCapture` は全部数えるので今は止まるが、4-4 の「念のための二重の守り」にはなっていない
- 直し方: 判定の行は `"\u001E@@jq "` の6文字がそろったときだけ「数えない」にする。または判定の行にも別の上限（たとえば 1行 64KB）を置く

### L-2. 画面でも `\u001E` なしの `@@jq ` を判定の行として読む。形も確かめない

- ファイルと行: `src/domain/java/protocol.ts` 44〜50行・61〜69行
- 問題: 学習者が標準エラーに `@@jq {"t":"done","passed":9,"total":9,…}` を出してから `System.exit(0)` すると合格になる。`isKnown` は `t` しか見ないので、`passed` の無い `done` も通る（`isCleared` は false になるので害は小さい）。設計は「悪意は気にしない」なので低
- 直し方: `parseProtocol(text, { requireRs: true })` のように、ブラウザの実行では `\u001E` を必須にする（貼り付けのときだけ無しを許す）。`done`・`case` は数値の項目があることも見る

### L-3. 足りない `}` のエラーの行が、学習者のファイルの最後の行より後ろになる

- ファイルと行: `src/runtime/java/core/result.ts` 143〜155行、`src/domain/java/wrap.ts` 69〜87行
- 再現: teavm で `void main() {\n    System.out.println("hi");\n`（3行）→ `reached end of file while parsing` が `line: 4`（外枠の `}` の行）
- 直し方: `mapDiagnostics` で、学習者のファイルの行は最後の行で頭打ちにする

### L-4. タブがある行で、teavm の列は JDK と違う（タブを8桁として数える）

- ファイルと行: `src/runtime/java/core/compile.ts` 25〜33行（teavm の `columnNumber`）、`scripts/lib/jdk.ts` 84〜85行（JDK は `^` の位置＝文字の位置）
- 再現: `void main() {\n\tint x = "a";\n}` → JDK は 10列目、teavm は 17列目
- 直し方: 画面がエディタに印を付けるときに困る。`mapDiagnostics` で、その行のタブを8桁で展開して文字の位置に戻す（teavm のときだけ）。エディタがタブを入れない設定なら、貼り付けたときだけの問題

### L-5. コンパイル中に止めた `run()` は、コンパイルが終わるまで `cancelled` を返さない。止めたあともコンパイルを送る

- ファイルと行: `src/runtime/java/teavmRunner.ts` 204〜224行、356〜368行
- 再現: 偽の Worker で、コンパイルの返事を出さないまま `cancel()` → 5秒たっても Promise が終わらない。返事が来てから `cancelled`
- 問題: 06-impl-notes.md の「止めた `run` の Promise を必ず終わらせる」は、いずれ終わるという意味では守れているが、画面がボタンの状態を Promise で戻すと遅れる。準備中（ダウンロード中）に止めた場合も、そのあとコンパイルを送ってしまう
- 直し方: `compileOnce` で `signal` に `stop` を入れ、止めたらすぐ `cancelled` で resolve する（Worker の返事は ID で捨てる）。`ensureReady()` のあとに `signal.cancelled` を見る

### L-6. `started` が来るまでは、時間の上限が無い

- ファイルと行: `src/runtime/java/teavmRunner.ts` 280〜282行
- 問題: run.worker が `started` を送る前（読み込み用 JS の import・Wasm の読み込み）に止まると、`run()` が終わらない。Node 側（`teavm-node.ts` 72行）には 60秒の上限がある
- 直し方: Worker を作ったときに、たとえば 30秒の上限を置き、`started` で解除する（`internal-error`）

### L-7. 逆難読化の Wasm（`compiler.wasm-deobfuscator.wasm`）を先読みしない。実行のたびに取得して読み込む

- ファイルと行: `src/runtime/java/compile.worker.ts` 49行、`src/runtime/java/run.worker.ts` 31行、`src/runtime/java/core/run.ts` 92〜96行
- 問題
  - 読み込み用 JS は、取得に失敗しても警告だけで進む（実測: `compiler.wasm-runtime.js` の中の `F` は catch して `null`）。オフラインで最初の実行をすると、例外の行（`error.line`）が取れない。12-2 の 4（オフライン）のテストでは気づきにくい
  - 実行ごとに 48KB の取得と Wasm の読み込みが入る
- 直し方: `prepare()` の取得の対象に入れる（Service Worker のキャッシュに入る）。または compile.worker で `WebAssembly.compile` した `Module` を run.worker に渡す

### L-8. content-verify `--only` の「expected が無い」の除外が、名前の前方一致

- ファイルと行: `scripts/content-verify.ts` 329行
- 問題: `--only ch00.sign` のとき、`ch00/sign-2` の「expected が無い」も `'ch00/sign-2'.startsWith('ch00/sign')` で残り、関係ない問題のせいで落ちる
- 直し方: `i.file === p.rel || i.file.startsWith(`${p.rel}/`)`

### L-9. タイルの大きさの検査が `render: tiles` のときだけ（設計は `draw`）

- ファイルと行: `scripts/lib/content.ts` 607行
- 問題: 6-9 の表は「draw: 期待する出力が 80桁×40行に収まる」。`render: text` の draw は見ない。どちらが正しいかを決めて、片方に合わせる
- 直し方: `t === 'draw' || front.render === 'tiles'` にする。または設計書を直し、06-impl-notes.md に書く

### L-10. `exit-code` を例外の型の欄に入れている

- ファイルと行: `src/runtime/java/core/result.ts` 125〜131行
- 問題: `RuntimeErrorInfo.type` は「例外の完全な型名」（JavaRunner.ts 47行）だが、`System.exit(3)` は `type: 'exit-code'` になる。画面・図鑑の判定（例外の型で判定）で、型名として扱われるおそれ
- 直し方: `RunResult` に `{ kind: 'crash'; … }` とは別に、終了コード ≠ 0 を表す形（`exited-early` に `code` があるのでそれを使う）にする。または型を `'exit'` のような予約語にして、JavaRunner.ts のコメントに書く

### L-11. 出力の上限（2,000行）は、そのまま実行と全部のケースの合計

- ファイルと行: `java/harness/JqCapture.java` 49〜61行
- 問題: 学習者の `main` はケースの数＋1回呼ばれるので、40行の絵でケースが50件あると上限に当たる。content-verify の Solution で NG になるので気づけるが、教材の決まりとして書かれていない
- 直し方: content/README.md に「出力の行数 ×（ケースの数＋1）が 2,000 行を超えないように」を1行書く（コードは変えない）

### L-12. `fakeRunner` のケースの番号が段階ごとに 1 から始まる（ハーネスは全段階の通し番号）

- ファイルと行: `src/runtime/java/fakeRunner.ts` 25行
- 問題: 手元課題（段階が複数）の画面のテストで、本物と番号がずれる（`expected/<段階>-<i>.txt` の対応を画面が `index` で引くと食い違う）
- 直し方: 段階をまたいだ通し番号にする（`JqCases` と同じ）

### L-13. import 文の `;` が無いと、外枠の `final class Main {` が離れた場所に入る

- ファイルと行: `src/domain/java/wrap.ts` 28行（`import\s[^;]*;` が改行をまたぐ）
- 問題: `import java.util.List`（`;` 忘れ）のあとに `void main() { int x = 1; …` があると、`int x = 1;` の直後に外枠が入り、エラーの文言と位置が分かりにくくなる
- 直し方: `[^;{}]*;` にして `{` をまたがない。まれなので低

### L-14. コメントと文字列を消す検査は、Unicode エスケープ（`class`）で外せる

- ファイルと行: `src/domain/java/strip.ts`、`precheck.ts`、`wrap.ts`、`scripts/lib/content.ts` 219〜225行
- 問題: Java はソースを読む前に `\uXXXX` を戻すので、`class Main` は class 宣言になる。事前の検査・予約名の検査を素通りする。事故で書くことはまず無いので低。H-1 のつなぎの検査で使う場合だけ大事
- 直し方: `maskCommentsAndStrings` の前に Unicode エスケープを戻す関数を1つ通す（長さが変わるので、位置を使う `wrap.ts` には使わない）

### L-15. `test:teavm` の `runtime-core.teavm.test.ts` は、1つのプロセスで teavm-javac を10回ほど読み込む

- ファイルと行: `scripts/lib/runtime-core.teavm.test.ts` 31〜42行
- 問題: 12-1 と 06-impl-notes.md は「Node で同じ compiler.wasm を何度も使うと落ちることがある」ので content-verify は1回ごとに子プロセスにした。このテストは毎回読み込み直すが同じプロセスで、CI でたまに落ちるかもしれない（自信がない。この Mac では通った）
- 直し方: CI でたまに落ちたら `runTeavmIsolated` を使う形にする。今は様子見でよい

### L-16. CI の `java-version-file` は未確認のまま

- ファイルと行: `.github/workflows/ci.yml` 65〜68行
- 問題: setup-java の説明に載っている形は `.java-version`・`.tool-versions`・`.sdkmanrc`。`java/JDK_VERSION` が読めるかは 06-impl-notes.md の「未確認」に書かれているとおり
- 直し方: 最初の CI のログで Java の版を見る。読めなければ `java-version: '25.0.5'` にして、`java/JDK_VERSION` との二重持ちをコメントで残す

### L-17. CSP の `<meta>` が、どの担当の仕事か書かれていない

- ファイルと行: `index.html`（このフェーズでは変更なし）、06-impl-notes.md の「範囲」
- 問題: 13章のフェーズ1 には CSP（11-4）が入っているが、1a の範囲にも「次の担当」（画面・v2 の DB・第0章の教材）にも書かれていない。確認ページでは CSP つきで動かしているので、本体の `index.html` に入れるだけ
- 直し方: 06-impl-notes.md の「範囲」か「次の担当へ」に、CSP は画面の担当が入れる、と1行足す

---

## 4. 読みやすさ（好みの問題を含む。どれも低）

- `scripts/lib/content.ts` 286〜290行: `course.yaml` を `readText` で2回読んでいる。`readYaml` を使えば1つにまとまる（`course` だけ `null` を返したいなら、`readYaml` に fallback として `null` を渡す）
- `src/runtime/java/teavmRunner.ts` 246行: `return { kind: 'internal-error', message: 'unreachable' }` は、ループを `attempt < 2` の固定にしているため。H-2 を直すときに、やり直しを「1回目 → 失敗なら作り直して2回目」の直線の形にすると、この行が消える
- `src/runtime/java/core/result.ts` 105〜107行: `(e as { stage: number }).stage` は、`summarize` が段階の終わりを知っているので、`ProtocolSummary` に `finishedStages` を持たせれば型の変換が要らない
- `teavmRunner.ts` 372行: 「15秒」が文言に固定。`compileTimeoutMs` を変えると表示と食い違う（テスト用の値なので実害は無い）

---

## 5. 確かめて問題が無かったもの

- SHA256SUMS の5件は research の付録（`java-in-browser.md`）の値と一致。`teavm:verify` は載っていないファイルも落とす
- Solution・wrong・alt は `chNN.json` に入らない（`toStepContent` の出力と `content-build.test.ts`）
- 判定の行の前の改行・`\u001E`・ASCII だけの JSON、`case.actual` の 20KB の切り方（サロゲートペアの途中で切らない）
- 外枠の列の戻し方（import あり・なし、1行目に import がある場合）
- `wrong` の宣言（test・exception・compile＋図鑑 ID の英・日・teavm・timeout）の判定と、わざと壊した教材 9種がそれぞれ正しい理由で落ちること
- `JqCases` の文字列リテラル（8進のエスケープで `\u` の前処理を避けている）
- 時間切れは `started` から数え、Wasm の読み込みを含めない。時間切れのあとも途中までの出力が届く（行の終わりで送る工夫）

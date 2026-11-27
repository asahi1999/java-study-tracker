# 教材の書き方（content/）

教材の作成担当のための手引き。正本は [設計書 6章](../docs/revamp/03-design.md)（形式）・[02-requirements.md 7〜8章](../docs/revamp/02-requirements.md)（カリキュラム・使ってよい文法・禁止の書き方）。食い違ったら設計書が正しい。

## 1. フォルダ

```
content/
  course.yaml          # 章の順番・題・部品（parts）・使ってよい文法・作品の版
  concepts.yaml        # 技カード
  errors.yaml          # エラー図鑑（判定の正規表現つき）
  gifts.yaml           # 宝箱のおみやげ
  errors-fixtures/     # エラー図鑑の判定を確かめるコード（<図鑑 ID>.java）
  ch00/<slug>/         # 1問1フォルダ（slug は英小文字・数字・-）
```

- 問題 ID は `ch<2桁>.<slug>`（例: `ch00.sign`）。フォルダと一致させる。**一度公開したら変えない**（記録が切れる）
- 新しい技カードは `concepts.yaml` に、部品は `course.yaml` の `parts` に足す（第0章の `parts` は仮。作るときに直してよい）

## 2. 1問のフォルダ

| 種類（`type`）                  | 置くファイル                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card`（説明カード）            | `problem.md`。任意で `Example.java`（あれば `source` が必須、`expected/0.txt` を作る）                                                             |
| `predict`（予想）               | `problem.md`、`Program.java`（読むだけのコード）、`expected/0.txt`                                                                                 |
| `quiz`（確認クイズ）            | `problem.md` だけ                                                                                                                                  |
| `fill` `fix` `implement` `draw` | `problem.md`、`Starter.java`、`Solution.java`、`wrong/*.java`（2つ以上。`fix` は1つ以上）、`expected/<i>.txt`、任意で `alt/*.java`・`given/*.java` |

- `Starter.java`: 学習者が最初に見るコード（画面では `Main.java`）。`Solution.java`: 模範解答（**画面にもビルドにも入らない**）
- `wrong/*.java`: よくある間違い。1行目に期待する落ち方を書く（4章）
- `alt/*.java`: 別解。全部の松明がともることを確かめる（テストが模範解答に寄りすぎていないか）
- `expected/<i>.txt`: ケース i（1始まり）の期待する出力。**手で書かない**（5章の `--update` で JDK の出力から作る）
- `Tests.java`（`judge.mode: tests`・`both`）はフェーズ2から使える。今は `mode: output` だけ

## 3. problem.md

先頭に `---` で囲んだ前書き（YAML）、そのあとに本文。

```yaml
---
id: ch00.sign # 必須。フォルダと一致
rev: 1 # 必須。判定に関わる中身を変えたら上げる
type: fill # 必須。card | predict | quiz | fill | fix | implement | draw
title: 看板を立てる # 必須。20文字まで
chapter: 0 # 必須。フォルダの章と一致
part: 1 # 必須。course.yaml の parts の n
order: 30 # 必須。章の中の並び（10刻みで空けておく）。重複不可
concepts: [println] # 必須（card・quiz は任意）。concepts.yaml の ID
minutes: 2 # 必須。1〜3。収まらなければ2ステップに分ける
goal: 看板が立つ # 任意。ホームの「できあがるとこうなる」（20文字まで）
source: compact # Java を含む種類で必須。第0〜3章は compact（void main() の形）
render: tiles # 任意。tiles = 出力をタイルで描く（絵の問題）
timeoutMs: 3000 # 任意。1000〜10000
stdin: '' # 任意。「そのまま実行」の入力（入力はフェーズ2の Scanner から）
judge: # fill | fix | implement | draw で必須
  mode: output
  cases:
    - name: 看板 # 画面に出るケースの名前
expectError: # fix で必須。ひな形のままだと何が起きるか（ほかの種類は任意。無ければ test）
  kind: compile # compile | exception | test | timeout
  dex: semicolon-expected # compile・exception のとき必須（errors.yaml の ID）
  type: java.lang.ArithmeticException # exception のとき必須
inputMode: text # predict で必須。text | choice
choices: ["3\n", "4\n"] # predict の choice・quiz で必須（2〜4個）
answer: 1 # quiz で必須（0始まり）。predict の正解は expected/0.txt から決まる
reviewed: false # 必須。true のものだけ公開される
---
```

- 全部の項目と組み合わせの決まりは `src/content/schema.ts`（Zod）。種類に合わない項目（例: `predict` に `judge`）はエラー
- 絵（`draw`）は、最初のケースの `stdin` を前書きの `stdin` と同じにする。期待する出力は 80桁×40行まで

### 本文の見出し（これ以外の見出しはエラー）

| 見出し       | card | predict・quiz | fill・fix・implement・draw               |
| ------------ | ---- | ------------- | ---------------------------------------- |
| `## 説明`    | 必須 | —             | —                                        |
| `## 問題`    | —    | 必須          | 必須                                     |
| `## ヒント1` | —    | 任意          | 必須                                     |
| `## ヒント2` | —    | —             | 必須                                     |
| `## ヒント3` | —    | —             | 必須（答えそのものにしない）             |
| `## 解説`    | —    | 必須          | 必須（2〜5行。模範解答の全体は書かない） |

## 4. 印と宣言

### Starter.java の印（任意）

```java
void main() {
    //@fold 壁を描く（読むだけ）
    System.out.println("#####");
    //@end
    System.out.println("#...#"); //@write
}
```

- 行の末尾の `//@write` … 「書くのはここ」の行
- `//@fold <説明1行>` の行から `//@end` の行まで … 折りたたむ範囲。印の行そのものは消える
- content-build が印を取り除き、行番号にして JSON に入れる。検証も印を取り除いたコードで動かす

### wrong/*.java の1行目（期待する落ち方。必須）

| 1行目                                                | 合う条件（JDK と teavm の両方で）                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `// expect: test`                                    | コンパイルが通り、最後まで動き、**値・出力の不一致**で1つ以上落ちる（例外だけで落ちるのは不可）   |
| `// expect: exception java.lang.ArithmeticException` | コンパイルが通り、その型の例外で1つ以上落ちる                                                     |
| `// expect: compile`                                 | コンパイルエラーになる                                                                            |
| `// expect: compile semicolon-expected`              | コンパイルエラーになり、最初のエラーの文言がその図鑑の判定に当たる（英語・日本語の JDK と teavm） |
| `// expect: timeout`                                 | 時間切れ（`timeoutMs`）になる                                                                     |

- 宣言と違う落ち方（`test` のつもりが打ち間違いでコンパイルエラー など）は検証で落ちる
- 1行目は検証の前に取り除かれる（行番号が1つずれる）
- Starter の落ち方は前書きの `expectError`（無ければ `test`）

## 5. 検証の動かし方

```sh
npm run content:build                                     # スキーマ・参照の検査と JSON の生成（JDK 不要）
npm run content:build -- --all                            # reviewed: false も含めて生成（開発サーバーで見るとき）
npm run content:verify -- --only ch00.sign --update       # expected/*.txt を JDK の出力から作る
npm run content:verify -- --only ch00.sign                # 1問だけ確かめる（--only ch00 で章ごと）
npm run content:verify                                    # 全部（CI の content ジョブと同じ）
npm run content:verify -- --no-teavm                      # JDK だけで速く（最後は teavm 込みで通す）
```

- 必要なもの: JDK 25（`java/JDK_VERSION`）と Node 24
- 確かめること（フェーズ1）: Solution・alt は JDK と teavm の両方で全部の松明がともり、ケースごとの出力が完全に一致する／Starter・wrong は宣言した落ち方で落ちる／predict・card のコードの出力が `expected/0.txt` と一致する／既定の `toString`（`Hero@1b6d3586`）が出ない／`errors.yaml` の fixture が判定に当たる
- `--update` は JDK と teavm の出力が違うときは書き直さずに落とす。差分は `git diff` で見る
- 出力: 問題ごとに `OK` / `NG`（理由）。NG が1つでもあれば終了コード 1

## 6. ブラウザで動かす問題で使わない書き方（02-requirements.md 8-3）

teavm-javac と JDK で結果が違う、または動かないもの。CI の自動検査はフェーズ2（`prohibited.ts`）なので、それまではレビューで見る。

| 使わない                                                                      | 代わり                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| `HashMap`・`HashSet`・`Map.of`・`Set.of`・`Map.ofEntries`（表示の順番が違う） | `TreeMap`・`LinkedHashMap`・`TreeSet`      |
| `Random`・`Math.random`・`ThreadLocalRandom`                                  | 決まった配列・文字列                       |
| `getMessage`・`printStackTrace`・例外を直接 `println`（メッセージが null）    | `getClass().getSimpleName()`               |
| `String.format`・`printf` の `%e`                                             | `%.2f`                                     |
| `Files`・`FileReader`・`FileWriter`・`Path`                                   | 手元課題（第7章）                          |
| `System.in`（`new Scanner(System.in)` 以外）                                  | `Scanner`                                  |
| 現在時刻（`System.currentTimeMillis`・`LocalDate.now` など）                  | 決まった日付                               |
| `System.getProperty`・`getenv`・`Runtime`・`Class.forName`・リフレクション    | —                                          |
| `hashCode()` の値や既定の `toString`（`Hero@1b6d3586`）を表示                 | `toString` を上書き                        |
| `Thread`・`Thread.sleep`・`System.exit`                                       | —                                          |
| `IO.println` など `IO` クラス                                                 | `System.out.println`                       |
| 拡張 `for` の中で、そのリストを `remove`                                      | `removeIf`、新しいリスト                   |
| 結果を使わないキャスト `(Integer) o`                                          | 結果を必ず使う                             |
| `static` な `Scanner`・`static` なフィールドに頼る書き方（ケース2つ以上）     | `main` の中で作る。そういう問題はケース1つ |
| Java 22 以降で入った API                                                      | —                                          |

ほかの決まり

- クラス名を `Jq` で始めない（判定用に予約。content-build が落とす）
- 章ごとの「使ってよい文法・API」（02-requirements.md 8章、`course.yaml` の `allow`）を守る。自動検査はフェーズ2。足りないときは前書きの `allowExtra` に理由を書く（`- api: 'String#repeat'`、`reason: 絵を描くため先取り`）
- 入力（`Scanner`）を使う問題はフェーズ2から。今はブラウザで入力を渡せないので、teavm-javac でコンパイルできず検証が落ちる
- 判定のケースは同じ実行の中で順に動く。学習者の `main` は「そのまま実行」とケースの数だけ呼ばれるので、標準エラーに書いたものも回数分出る

## 7. 公開まで（設計書 6-11）

1. フォルダを作る（`reviewed: false`）
2. `npm run content:verify -- --only <id> --update` で `expected` を作り、差分を見る
3. レビュー担当がチェックリストで確かめる（問題文だけから期待する出力を書いて `expected` と比べる、ヒント3が答えそのものでない、解説が出力と矛盾しない、まだ習っていない用語が無い、1〜3分で終わる）
4. `reviewed: true` にしてコミット。CI の content ジョブが通れば公開される（`ids.lock` はフェーズ2）
5. 公開済みのものの判定に関わる中身を変えたら `rev` を上げる

- **模範解答の中身を、コミットのメッセージ・プルリクエスト・エージェントの返答に書かない**（「第0章 8問追加、CI 全通過」程度にする）
- 見本は `tests/content-fixtures/good/`（形式の見本。本物の教材ではない）

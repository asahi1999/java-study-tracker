---
id: ch02.fix-lonely-else
rev: 1
type: fix
title: ひとりぼっちの else
chapter: 2
part: 1
order: 30
concepts: [if, compile-error]
minutes: 2
goal: 鍵の扉が直る
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 鍵が無い部屋
expectError:
  kind: compile
  dex: else-without-if
reviewed: false
---

## 問題

鍵 `keys` が 0 なので、上の壁は閉じたままになるはず。ところが、コンパイルエラーで止まる。直す。できあがりはこうなる。

```text
#####
#.@.#
#####
```

## ヒント1

まず実行して、エラーの行の番号を見る。`else` の行を指している。

## ヒント2

`else` は、すぐ前の `if` の `{ }` とつながっていないと使えない。`if` の行をよく見る。

## ヒント3

`if ( )` と `{` の間にある1文字が、`if` をそこで終わらせている。

## 解説

`if (条件);` の `;` は「何もしない文」。`if` はそこで終わり、次の `{ }` はただのまとまりになる。
そのため、`else` の前に `if` が無いことになる。`;` を消すと、`{ }` が `if` につながる。

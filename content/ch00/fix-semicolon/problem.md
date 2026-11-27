---
id: ch00.fix-semicolon
rev: 1
type: fix
title: 消えた ; を直す
chapter: 0
part: 3
order: 100
concepts: [semicolon, compile-error]
minutes: 2
goal: 壊れた部屋が直る
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 直った部屋
expectError:
  kind: compile
  dex: semicolon-expected
reviewed: false
---

## 問題

部屋を描くはずが、コンパイルエラーで止まる。直して、部屋を出す。できあがりはこうなる。

```text
#####
#.@.#
#####
```

## ヒント1

まず実行して、エラーに出る行の番号を見る。

## ヒント2

文の終わりには、決まった記号が要る。ほかの行と見くらべる。

## ヒント3

エラーの行の終わりに、ほかの行にはある1文字が無い。`" "` の中ではなく外に足す。

## 解説

Java の文は `;` で終わる。1つ忘れると、プログラム全体がコンパイルできない。
`';' expected` は「ここに `;` が要る」という意味。行の番号がその場所を指す。

---
id: ch00.fix-string
rev: 1
type: fix
title: 閉じない看板
chapter: 0
part: 3
order: 110
concepts: [string, compile-error]
minutes: 2
goal: 看板と部屋が直る
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 直った看板
expectError:
  kind: compile
  dex: unclosed-string
reviewed: false
---

## 問題

看板の行がおかしくて、コンパイルエラーで止まる。直して、看板と部屋を出す。できあがりはこうなる。

```text
ようこそ
#####
#.@.#
#####
```

## ヒント1

実行して、エラーに出る行の番号を見る。英語なら `unclosed string literal`（閉じていない文字列）。

## ヒント2

文字列は `"` で始まり、`"` で終わる。エラーの行の `"` を数える。

## ヒント3

足りない `"` は1つ。文字列の中身が終わるところに置く。`)` より前。

## 解説

文字列は `"` で始めて `"` で閉じる。閉じないと、行の終わりまで全部が文字列だと読まれる。
そのため `)` も `;` も文字列の一部になり、コンパイルできない。

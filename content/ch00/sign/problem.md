---
id: ch00.sign
rev: 1
type: fill
title: 入口の看板
chapter: 0
part: 1
order: 30
concepts: [string, println]
minutes: 2
goal: 入口に看板が立つ
easy: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 看板
reviewed: false
---

## 問題

部屋の上に、看板を立てる。

1行目の `____` を書きかえて、`ようこそ` と出す。できあがりはこうなる。

```text
ようこそ
#####
#.@.#
#####
```

## ヒント1

`" "` の中には、日本語も書ける。

## ヒント2

`" "` は消さない。`" "` が無いと、Java は文字ではなく名前だと思う。

## ヒント3

変えるのは1行目の `" "` の中だけ。ひらがな4文字にする。

## 解説

`" "` で囲んだ文字の並びを「文字列」という。
文字列の中身は、そのまま画面に出る。日本語も使える。

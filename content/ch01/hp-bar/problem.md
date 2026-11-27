---
id: ch01.hp-bar
rev: 1
type: draw
title: HP バーを描く
chapter: 1
part: 4
order: 120
concepts: [repeat, concat]
minutes: 2
goal: HP バーが出る
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: HP 70/100
reviewed: false
---

## 問題

HP を、バーで見せる。`=` が残りの HP、`-` が減ったぶん。両端は `[` と `]`。

`=` の数 `full` と `-` の数 `empty` は、もう計算してある。`// ここに` の行を書きかえて、バーを1行で出す。できあがりはこうなる。

```text
HP 70/100
[=======---]
```

## ヒント1

`"=".repeat(full)` で、`=` を `full` 個並べた文字列になる。

## ヒント2

`[`、`=` の並び、`-` の並び、`]` の4つを `+` でつなぐ。

## ヒント3

`-` の並びには、`full` ではなく `empty` を使う。`println` は1回だけ。

## 解説

`repeat` で作った文字列も、`+` でつなげられる。
`hp` が変わると `full` と `empty` も変わり、同じコードでバーの長さが変わる。

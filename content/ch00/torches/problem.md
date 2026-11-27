---
id: ch00.torches
rev: 1
type: draw
title: 松明を置く
chapter: 0
part: 3
order: 80
concepts: [println, string]
minutes: 2
goal: 松明が部屋を照らす
showcase: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 松明の部屋
reviewed: true
---

## 問題

部屋が暗い。上と下の壁に、松明 `*` を2本ずつ埋めこむ。できあがりはこうなる。

```text
##*###*##
#.......#
#...@..>#
#.......#
##*###*##
```

`>` は下り階段。部屋の中の3行は、もうできている。

## ヒント1

変えるのは、上の壁と下の壁の2行だけ。

## ヒント2

`#` の一部を `*` に置きかえる。全体の文字の数は9のまま。

## ヒント3

左から数えて、何文字目が `*` になっているかを、できあがりの図で数える。上と下は同じ形。

## 解説

文字列の中の1文字が、タイルの1マスになる。
`#` を `*` に変えると、その場所の壁が松明になる。

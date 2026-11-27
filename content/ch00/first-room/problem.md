---
id: ch00.first-room
rev: 1
type: draw
title: 最初の部屋
chapter: 0
part: 2
order: 70
concepts: [println]
minutes: 3
goal: 勇者のいる部屋
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 部屋
reviewed: false
---

## 問題

上と下の壁だけがある。間に3行足して、部屋を作る。できあがりはこうなる。

```text
#######
#.....#
#..@..#
#.....#
#######
```

薄く見えている形に、自分の部屋を重ねる。

## ヒント1

1行に `println` を1つ使う。3行なら3つ。

## ヒント2

どの行も、左右の端は壁 `#`、間は床 `.`。幅は上の壁と同じ7文字。

## ヒント3

真ん中の行だけ、床の真ん中を勇者 `@` にする。`@` の左右に床が2つずつ。

## 解説

`println` を上から順に並べると、その順に行が積み重なる。
同じ幅の行をそろえると、四角い部屋になる。

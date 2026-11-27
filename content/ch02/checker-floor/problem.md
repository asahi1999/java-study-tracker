---
id: ch02.checker-floor
rev: 1
type: draw
title: 市松模様の床
chapter: 2
part: 4
order: 120
concepts: [nested-loop, if]
minutes: 3
goal: 床が市松模様になる
optional: true
showcase: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 市松模様
reviewed: true
---

## 問題

石の床に、苔 `%` を市松模様に生やす。左上は床 `.`。できあがりはこうなる。

```text
.%.%.%.%
%.%.%.%.
.%.%.%.%
%.%.%.%.
```

書きかえるのは、内側の `for` の中の1行だけ。

## ヒント1

横に1マス進むと `.` と `%` が入れかわる。下に1行進んでも入れかわる。

## ヒント2

`x` だけで決めると、どの行も同じ並びになる。`x` と `y` の両方を使う。

## ヒント3

`x + y` を作ってみる。左上は 0 で、となりのマスへ進むたびに 1 ずつ変わる。偶数か奇数かで、出す文字を分ける。

## 解説

市松模様は「`x + y` が偶数なら `.`、奇数なら `%`」と書ける。
となりのマスは `x` か `y` が1つちがうので、偶数と奇数が必ず入れかわる。

---
id: ch02.room-door
rev: 1
type: fill
title: 扉を付ける
chapter: 2
part: 5
order: 130
concepts: [logic, else-if]
minutes: 2
goal: 下の壁に扉が開く
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 扉のある部屋
reviewed: true
---

## 問題

壁で囲んだ部屋に、扉 `+` を1つ付ける。場所は、下の壁の真ん中。`false` を書きかえる。できあがりはこうなる。

```text
#########
#.......#
#.......#
#.......#
####+####
```

## ヒント1

扉は1マスだけ。そのマスの `x` と `y` を、できあがりの図で数える（左上が `x` 0、`y` 0）。

## ヒント2

扉は「いちばん下の行」で、しかも「真ん中の列」のマス。片方だけでは、行か列がまるごと扉になる。

## ヒント3

2つの条件を「かつ」でつなぐ。

## 解説

`&&` は、両方が true のときだけ true。行と列の両方が合う1マスだけが扉になる。
扉の `if` は壁の `else if` より上にあるので、壁より先に選ばれる。順番を逆にすると、扉は壁に負ける。

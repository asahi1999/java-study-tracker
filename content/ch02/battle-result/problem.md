---
id: ch02.battle-result
rev: 1
type: implement
title: 勝ち負けを出す
chapter: 2
part: 6
order: 150
concepts: [else-if, compare]
minutes: 3
goal: 5つの戦いの勝ち負け
source: compact
judge:
  mode: output
  cases:
    - name: 5つの戦い
reviewed: false
---

## 問題

5つの戦いのあとの HP が、`heroHp`（勇者）と `monsterHp`（魔物）に入っている。`// ここに書く` に、結果を出すコードを書く。

- 魔物の HP が 0 以下 → `勝ち`
- そうでなく、勇者の HP が 0 以下 → `負け`
- どちらでもない → `つづく`

両方とも 0 以下のときは、勇者が先に攻撃したので `勝ち`。できあがりはこうなる。

```text
1戦目: 勝ち
2戦目: 負け
3戦目: つづく
4戦目: 勝ち
5戦目: 勝ち
```

## ヒント1

3つに分けるので、`if`・`else if`・`else` を使う。結果は `println` で出す。

## ヒント2

「0 以下」は `<= 0`。HP はマイナスになることもある（4戦目）。

## ヒント3

上から順に調べて、最初に当たった1つだけが動く。両方 0 以下のとき（5戦目）に `勝ち` になるよう、調べる順番を決める。

## 解説

`if`・`else if`・`else` は、上から見て最初に true になった1つだけを動かす。だから、先に決めたい「勝ち」を一番上に置く。
`if` を2つに分けると、1つの戦いで2行出ることがある。

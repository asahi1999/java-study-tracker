---
id: ch01.damage
rev: 1
type: implement
title: ダメージの計算
chapter: 1
part: 3
order: 100
concepts: [arithmetic, math-max-min, concat]
minutes: 3
goal: 2体へのダメージが出る
source: compact
judge:
  mode: output
  cases:
    - name: スライムとゴーレム
reviewed: false
---

## 問題

勇者（攻撃 `attack`）が、スライムとゴーレムを1回ずつ攻撃する。

- ダメージ ＝ 攻撃 − 相手の守り
- ただし、ダメージは最低でも 1（マイナスや 0 にしない）

`// ここから書く` の下に、計算と表示を書く。こう出す。

```text
スライムに 4 のダメージ
ゴーレムに 1 のダメージ
```

数は、変数から計算する。

## ヒント1

ゴーレムの守りは攻撃より大きい。そのまま引くとマイナスになる。

## ヒント2

「計算した値」と「1」のうち、大きいほうを使えばよい。説明カードの `Math` の道具を思い出す。

## ヒント3

ダメージを `int` の変数に入れてから、`+` で文字列とつなぐ。2体ぶん、同じ形を2回書く。

## 解説

`attack - golemGuard` は `-2`。`Math.max(-2, 1)` で `1` になる。
`if` を使わなくても、`Math.max` で「最低でも 1」を書ける。

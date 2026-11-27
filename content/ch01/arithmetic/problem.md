---
id: ch01.arithmetic
rev: 1
type: card
title: 計算する
chapter: 1
part: 2
order: 50
concepts: [arithmetic, int-division, modulo, compound-assign, math-max-min]
minutes: 2
source: compact
reviewed: false
---

## 説明

計算の記号は `+` `-` `*` `/` `%`。`*` はかけ算、`%` は割り算のあまり。

`int` どうしの `/` は、小数を切り捨てる。`7 / 2` は `3`。

短く書く形もある。

- `hp += 5;` … `hp = hp + 5;` と同じ
- `hp -= 8;` … `hp = hp - 8;` と同じ
- `level++;` … 1ふやす

`Math` の道具も使える。

- `Math.max(a, b)` … 大きいほう
- `Math.min(a, b)` … 小さいほう
- `Math.abs(a)` … マイナスを取った値

`Math.max(-3, 1)` は `1`。「最低でも 1」にしたいときに使う。

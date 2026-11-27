---
id: ch02.nested
rev: 1
type: card
title: ループの中のループ
chapter: 2
part: 4
order: 90
concepts: [nested-loop, break, continue]
minutes: 2
source: compact
render: tiles
reviewed: false
---

## 説明

`for` の中に `for` を入れると、縦と横の両方をくりかえせる。

- 外側の `y` … 何行目か（上が 0）
- 内側の `x` … その行の何文字目か（左が 0）
- 内側のループが終わったら `println()` で改行して、次の行へ

`y` が 1 ふえるあいだに、`x` は 0 から最後まで1周する。`x` と `y` で、どのマスかが決まる。

ループを途中で変える語が2つある。どちらも、いちばん内側のループにだけ効く。

- `break;` … ループをすぐ終わる。残りの回はやらない
- `continue;` … その回の残りを飛ばして、次の回に進む

下のコードは、3行×5文字の床を描き、`x == 2` かつ `y == 1` のマスにだけ勇者 `@` を置く。`@` の場所を変えてみる。

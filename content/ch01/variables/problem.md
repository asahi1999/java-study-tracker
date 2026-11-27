---
id: ch01.variables
rev: 1
type: card
title: 変数に名前を付ける
chapter: 1
part: 1
order: 10
concepts: [variable, types, concat]
minutes: 2
source: compact
reviewed: true
---

## 説明

勇者のステータスを作る。まず、値に名前を付けて、取っておく。これが「変数」。

`型 名前 = 値;` と書く。型は、入れる値の種類。

- `int` … 整数（`30`）
- `double` … 小数（`1.5`）
- `boolean` … `true` か `false`
- `char` … 1文字（`'@'`。`' '` で囲む）
- `String` … 文字列（`"ユウ"`）

`hp = hp - 5;` のように、あとから入れ直せる。2回目は型を書かない。

`+` は、文字列と値をつなぐ。`name + " HP " + hp` は `ユウ HP 25` になる。

`final int MAX_HP = 50;` は、あとから変えられない変数。`var hp = 30;` は、型を値から決めてもらう書き方。

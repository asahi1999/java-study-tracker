---
id: ch01.concat-order
rev: 1
type: predict
title: つなぐ順番
chapter: 1
part: 1
order: 30
concepts: [concat]
minutes: 1
source: compact
inputMode: choice
choices:
  - "HP 34\n7 HP\n"
  - "HP 7\n7 HP\n"
  - "HP 34\n34 HP\n"
reviewed: true
---

## 問題

このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`+` は左から順に計算する。文字列が先に来たら、そこからは「つなぐ」になる。

## 解説

上の `println` は、`"HP " + hp` が先に文字列になる。そこに `heal` をつなぐので `HP 34`。
下の `println` は、`hp + heal` が先で、数どうしなので `7`。そこに `" HP"` をつなぐ。

---
id: ch01.int-division
rev: 1
type: predict
title: 半分だけ回復
chapter: 1
part: 2
order: 60
concepts: [int-division]
minutes: 1
source: compact
inputMode: choice
choices:
  - "回復 12\n"
  - "回復 12.5\n"
  - "回復 13\n"
reviewed: true
---

## 問題

薬で、最大 HP の半分だけ回復する。このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`maxHp` も `2` も `int`。

## 解説

`int` どうしの割り算は、小数を切り捨てる。`25 / 2` は `12`。
四捨五入ではないので `13` にもならない。

---
id: ch01.modulo
rev: 1
type: predict
title: 金貨を分ける
chapter: 1
part: 2
order: 70
concepts: [modulo, int-division]
minutes: 1
optional: true
source: compact
inputMode: choice
choices:
  - "1人 3\nのこり 2\n"
  - "1人 3\nのこり 3\n"
  - "1人 3.4\nのこり 0\n"
reviewed: true
---

## 問題

金貨17枚を、5人で同じ数ずつ分ける。このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`%` は、割り算のあまり。

## 解説

`17 / 5` は切り捨てで `3`。1人3枚ずつ配ると、15枚使う。
のこりは `17 - 15` で `2`。これが `17 % 5`。
`/` と `%` は `+` より先に計算するので、文字列とつなぐ前に数が決まる。

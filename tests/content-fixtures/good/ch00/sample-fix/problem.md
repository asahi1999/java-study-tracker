---
id: ch00.sample-fix
rev: 1
type: fix
title: 見本の修理
chapter: 0
part: 2
order: 50
concepts: [println]
minutes: 1
source: compact
judge:
  mode: output
  cases:
    - name: 直った
expectError:
  kind: compile
  dex: unclosed-string
reviewed: true
---

## 問題

直す。

## ヒント1

エラーの行を見る。

## ヒント2

" を数える。

## ヒント3

閉じる " が無い。

## 解説

文字列は " で閉じる。
閉じないとコンパイルできない。

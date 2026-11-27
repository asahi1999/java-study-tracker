---
id: ch00.print-row
rev: 1
type: predict
title: print のつながり
chapter: 0
part: 2
order: 60
concepts: [print, println]
minutes: 1
source: compact
render: tiles
inputMode: choice
choices:
  - "#..@#\n#####\n"
  - "#\n..\n@#\n#####\n"
  - "#..\n@#\n#####\n"
reviewed: true
---

## 問題

このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`print` のあとは改行しない。改行するのは `println` だけ。

## 解説

`print` の2つは改行しないので、`#` と `..` と `@#` が1行につながる。
`println("@#")` で改行し、最後の `#####` は2行目に出る。

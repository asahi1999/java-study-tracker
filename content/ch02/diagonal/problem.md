---
id: ch02.diagonal
rev: 1
type: predict
title: continue のあと
chapter: 2
part: 4
order: 100
concepts: [nested-loop, continue]
minutes: 2
source: compact
render: tiles
inputMode: choice
choices:
  - "*...\n.*..\n..*.\n"
  - "*\n.*\n..*\n"
  - "*....\n.*...\n..*..\n"
reviewed: true
---

## 問題

このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`continue` は、その回の残りを飛ばして次の `x` に進む。内側のループは終わらない。

## 解説

`x == y` のマスでは `*` を出し、`continue` で下の `print(".")` を飛ばす。ループは続くので、どの行も4文字。
`*` の場所は `y` と同じなので、1行ごとに1つ右へずれる。`break` なら、`*` のところで行が終わる。

---
id: ch00.count-lines
rev: 1
type: predict
title: 何行出る？
chapter: 0
part: 2
order: 50
concepts: [comment, println]
minutes: 1
source: compact
render: tiles
inputMode: choice
choices:
  - "#####\n#.@.#\n#####\n"
  - "#####\n#*.*#\n#.@.#\n#####\n"
  - "#####\n#.@.#\n#####\n#*.*#\n"
reviewed: false
---

## 問題

このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`//` で始まる行は、実行されない。

## 解説

3行目は `//` で始まるので、コメント。実行されない。
残りの `println` 3つが上から順に動き、3行出る。

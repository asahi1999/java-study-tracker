---
id: ch02.which-branch
rev: 1
type: predict
title: どの道に進む？
chapter: 2
part: 1
order: 20
concepts: [else-if, compare]
minutes: 1
source: compact
inputMode: choice
choices:
  - "つかれた\n"
  - "ふらふら\n"
  - "つかれた\nふらふら\n"
reviewed: true
---

## 問題

勇者の HP で、ようすを出す。このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`>=` は「以上」。その数ちょうども入る。

## 解説

`hp >= 10` は false。次の `hp >= 5` は、5 が「5 以上」なので true。ここで「つかれた」を出す。
`hp >= 1` も true だが、動かない。`else if` は、最初に true になった1つだけが動く。

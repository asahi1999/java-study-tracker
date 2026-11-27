---
id: ch01.level-up
rev: 1
type: fill
title: レベルアップ
chapter: 1
part: 2
order: 80
concepts: [compound-assign]
minutes: 2
goal: レベルと攻撃力が上がる
source: compact
judge:
  mode: output
  cases:
    - name: レベルアップ
reviewed: true
---

## 問題

スライムを倒して、レベルが上がった。

`// ここに` の2行を書きかえる。`level` を1ふやし、`attack` を3ふやす。こう出る。

```text
Lv 2
攻撃 8
```

`++` と `+=` を使う。

## ヒント1

1ふやすのは `++`、決まった数をふやすのは `+=`。

## ヒント2

どちらも、文の終わりに `;` が要る。

## ヒント3

`+=` の右には、ふやす数だけを書く。`=+` と逆に書くと、別の意味になる。

## 解説

`level++;` は `level = level + 1;` と同じ。`attack += 3;` は `attack = attack + 3;` と同じ。
`attack =+ 3;` は `attack = +3;`（3を入れ直す）と読まれ、エラーにならないので気づきにくい。

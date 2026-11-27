---
id: ch01.status-line
rev: 1
type: fill
title: ステータスを1行で
chapter: 1
part: 1
order: 20
concepts: [variable, concat]
minutes: 2
goal: 勇者の名前と HP が出る
easy: true
source: compact
judge:
  mode: output
  cases:
    - name: ステータス
reviewed: false
---

## 問題

勇者の名前と HP が、変数に入っている。

`""` を書きかえて、3つの変数をつなぎ、こう出す。

```text
ユウ HP 30/50
```

名前や数は、直接書かずに変数を使う。

## ヒント1

`+` で、変数と文字列をつなげる。

## ヒント2

変数の名前は `" "` で囲まない。囲むと、名前がそのまま文字として出る。

## ヒント3

変数の間に入る `HP` と `/` は、文字列として `" "` で書く。空白も文字に入る。

## 解説

`+` は、文字列と変数の中身をつないで、1つの文字列にする。
変数を使えば、HP が変わっても同じ行のまま正しく出る。

---
id: ch01.fix-type
rev: 1
type: fix
title: 型が合わない
chapter: 1
part: 1
order: 40
concepts: [types, variable]
minutes: 2
goal: HP が正しく減る
source: compact
judge:
  mode: output
  cases:
    - name: 5減ったHP
expectError:
  kind: compile
  dex: incompatible-types
reviewed: false
---

## 問題

勇者が罠で 5 のダメージを受けた。HP を計算して出すはずが、コンパイルエラーで止まる。

直して、こう出す。

```text
ユウ HP 25
```

## ヒント1

実行して、エラーに出る行の番号を見る。英語なら `incompatible types`（型が合わない）。

## ヒント2

その行の変数の型と、右側の値の種類を見くらべる。`int` に入るのは整数。

## ヒント3

`"30"` は数ではなく、文字の並び。型の宣言のほうは変えない（あとで引き算に使うため）。

## 解説

`"30"` は `String`（文字列）なので、`int` の変数には入らない。
`" "` を外して数の `30` にすると、型がそろって引き算もできる。

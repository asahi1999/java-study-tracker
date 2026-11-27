---
id: ch01.fix-uninit
rev: 1
type: fix
title: からっぽの変数
chapter: 1
part: 3
order: 90
concepts: [variable, compound-assign]
minutes: 2
goal: スライムの攻撃が当たる
source: compact
judge:
  mode: output
  cases:
    - name: 4減ったHP
expectError:
  kind: compile
  dex: uninitialized
reviewed: false
---

## 問題

スライムの攻撃で、勇者の HP が 4 減るはず。でも、コンパイルエラーで止まる。

直して、こう出す。

```text
HP 26
```

## ヒント1

エラーの行の番号を見る。英語なら `might not have been initialized`（まだ値が入っていないかも）。

## ヒント2

`damage` は、作っただけで値が入っていない。値の無い変数は計算に使えない。

## ヒント3

値は、使う行より前に入れる。宣言する行で入れるのがいちばん簡単。

## 解説

`int damage;` は入れ物を作るだけで、中身はまだ無い。Java は、空の変数を使う前に止めてくれる。
`int damage = 4;` のように、作るときに最初の値を入れておく。

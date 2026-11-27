---
id: ch01.printf
rev: 1
type: card
title: printf で書式をそろえる
chapter: 1
part: 5
order: 140
concepts: [printf, formatted, cast]
minutes: 2
source: compact
reviewed: true
---

## 説明

`+` でつなぐ代わりに、書式に値をはめる書き方がある。

- `%s` … 文字列
- `%d` … 整数
- `%.1f` … 小数（小数点の下1けた）
- `%n` … 改行

`System.out.printf(書式, 値, 値...)` は、はめた結果を出す。改行はしないので、最後に `%n` を書く。

`書式.formatted(値, 値...)` は、はめた結果の文字列を作る。変数に入れられる。

`int` どうしの割り算で小数がほしいときは、`(double) hp` のように型を変える。これを「キャスト」という。

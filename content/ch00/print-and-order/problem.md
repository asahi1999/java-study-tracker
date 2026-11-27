---
id: ch00.print-and-order
rev: 1
type: card
title: print と println
chapter: 0
part: 2
order: 40
concepts: [print, comment]
minutes: 1
source: compact
render: tiles
reviewed: true
---

## 説明

出し方は2つある。

- `System.out.println("...")` … 出したあと、改行する（次は下の行から）
- `System.out.print("...")` … 改行しない（次は同じ行の続きから）

`//` から行の終わりまでは「コメント」。メモ書きで、実行されない。

下のコードでは、出力の1行目の `#.@` を `print` 3回で作っている。`( )` の中が空の `System.out.println()` は、改行だけをする。

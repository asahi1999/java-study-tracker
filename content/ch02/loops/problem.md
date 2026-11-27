---
id: ch02.loops
rev: 1
type: card
title: くりかえす for と while
chapter: 2
part: 3
order: 60
concepts: [for, while]
minutes: 2
source: compact
render: tiles
reviewed: false
---

## 説明

同じことを何回もするときは、ループを使う。

`for (int x = 0; x < 7; x++) { }` は、次の3つでできている。

1. `int x = 0` … 最初に1回だけ。x を 0 にする
2. `x < 7` … 毎回、`{ }` の前に見る。true のあいだ続ける
3. `x++` … 毎回、`{ }` のあとで x を1ふやす

x は 0, 1, 2, …, 6 と変わり、`{ }` は7回動く。

`while (条件) { }` は、条件が true のあいだくりかえす。中で変数を変えないと、条件がずっと true のままで終わらない。

`System.out.println()` は、改行だけを出す。`print` で横に並べたあと、行を終えるのに使う。

下のコードは、上と下の壁を `for` で、床を `while` で描く。`7` を2か所とも `9` に、`5` を `7` にすると、部屋が広がる。

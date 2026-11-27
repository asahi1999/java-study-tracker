---
id: ch02.walled-room
rev: 1
type: draw
title: 壁で囲む
chapter: 2
part: 4
order: 110
concepts: [nested-loop, logic]
minutes: 3
goal: 床のまわりが壁になる
showcase: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 壁の部屋
reviewed: true
---

## 問題

今は9×5マスの床だけがある。`false` を書きかえて、まわりを壁 `#` で囲む。できあがりはこうなる。

```text
#########
#.......#
#.......#
#.......#
#########
```

## ヒント1

壁になるのは、いちばん上の行・いちばん下の行・左の端・右の端の4つ。

## ヒント2

いちばん上は `y == 0`、いちばん左は `x == 0`。いちばん下と右の数は、ループの `<` の右の数から考える。

## ヒント3

4つの条件のうち、どれか1つでも当てはまれば壁。4つを「または」でつなぐ。

## 解説

端のマスは「`y` が最初か最後」または「`x` が最初か最後」。`||` で4つをつなぐと、1つでも true なら壁になる。
ループは `y < 5` なので、最後の `y` は 4。5 ではない。

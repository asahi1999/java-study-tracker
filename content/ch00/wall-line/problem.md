---
id: ch00.wall-line
rev: 1
type: fill
title: 壁を1行
chapter: 0
part: 1
order: 20
concepts: [println]
minutes: 1
goal: 部屋が壁で閉じる
easy: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: 部屋が閉じる
reviewed: true
---

## 問題

部屋の下の壁が、まだ無い。

`____` を書きかえて、下の壁を作る。できあがりはこうなる。

```text
#####
#.@.#
#####
```

## ヒント1

壁は `#` の文字。

## ヒント2

1行目は上の壁。下の壁も、同じ形にする。

## ヒント3

`" "` の中だけを変える。`#` の数は上の壁と同じ。

## 解説

`println` は、`" "` の中の文字をそのまま1行出す。
`#` を5つ並べると、5マスの壁になる。

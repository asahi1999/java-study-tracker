---
id: ch01.status-frame
rev: 1
type: draw
title: ステータスの枠
chapter: 1
part: 5
order: 150
concepts: [length, repeat, formatted, to-upper-case]
minutes: 3
goal: ステータスが枠に入る
showcase: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: ステータス画面
reviewed: true
---

## 問題

ステータスの行を、壁 `#` の枠で囲む。真ん中の行は、もうできている。

`// ここに` の2行を書きかえて、上と下の壁を出す。壁の長さは、`line` の文字数から計算する。できあがりはこうなる。

```text
################
# YUU Lv2 HP35 #
################
```

名前やレベルが変わっても、枠が合うようにする。

## ヒント1

真ん中の行は、`line` の左右に `# ` と ` #` を付けている。

## ヒント2

`line.length()` で `line` の文字の数が分かる。左右に付けた文字のぶんも足す。

## ヒント3

`# ` と ` #` は2文字ずつ。左右の両方のぶんを、`"#".repeat(…)` の `( )` の中で `line.length()` に足す。

## 解説

`line` は12文字、左右の `# ` と ` #` が2文字ずつで、合わせて16文字。
`length()` を使えば、名前が長くなっても枠の幅が自動で合う。

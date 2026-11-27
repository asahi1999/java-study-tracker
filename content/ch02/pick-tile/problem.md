---
id: ch02.pick-tile
rev: 1
type: predict
title: どのタイルになる？
chapter: 2
part: 2
order: 50
concepts: [switch, ternary]
minutes: 2
source: compact
render: tiles
inputMode: choice
choices:
  - "#####\n#.$.#\n#####\n"
  - "##+##\n#.$.#\n#####\n"
  - "#####\n#.?.#\n#####\n"
reviewed: false
---

## 問題

部屋で見つけた物 `found` と、鍵の数 `keys` で、部屋の形が決まる。このコードを実行すると、何が出るか。選ぶ。

## ヒント1

`case "金貨", "宝石"` は、どちらの値でも当たる。`条件 ? A : B` は、条件が true なら A。

## 解説

`found` は `"宝石"` なので、1つ目の `case` に当たり、`tile` は `"$"`。
`keys > 0` は false なので、`door` は `:` の右の `"#"`。上の壁は閉じたまま。

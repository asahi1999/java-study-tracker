---
id: ch01.bar-scale
rev: 1
type: fill
title: バーの長さを計算
chapter: 1
part: 4
order: 130
concepts: [int-division, arithmetic, repeat]
minutes: 3
goal: HP 35/50 のバーが出る
optional: true
source: compact
render: tiles
judge:
  mode: output
  cases:
    - name: HP 35/50
reviewed: true
---

## 問題

HP バーは、いつも10マス。最大 HP が 50 でも、10マスに縮めて描く。

`0` を書きかえて、`=` の数 `full` を、`hp` と `maxHp` から計算する式にする。できあがりはこうなる。

```text
HP 35/50
[=======---]
```

## ヒント1

HP が満タン（50）なら `full` は 10。半分（25）なら 5。

## ヒント2

`hp / maxHp` は `int` どうしの割り算。35 / 50 がいくつになるかを考える。

## ヒント3

割り算を先にすると、小さくなりすぎる。かけ算を先にする。

## 解説

`hp / maxHp` は切り捨てで `0` になり、`0 * 10` も `0`。バーが空になる。
先に 10 をかけてから割ると、`350 / 50` で `7` になる。割り算はなるべく最後にする。

---
id: ch02.fix-endless-while
rev: 1
type: fix
title: 終わらない while
chapter: 2
part: 3
order: 70
concepts: [while]
minutes: 2
goal: スライムをたおせる
easy: true
source: compact
judge:
  mode: output
  cases:
    - name: たおすまでの回数
timeoutMs: 2000
expectError:
  kind: timeout
reviewed: true
---

## 問題

スライムの HP は 20。勇者の攻撃1回で、HP は 6 減る。HP が 0 以下になるまで攻撃して、その回数を出したい。

ところが、実行すると時間切れになる。直す。できあがりはこうなる。

```text
たおすまでに 4 回
```

## ヒント1

`while` は、条件が true のあいだくりかえす。`slimeHp > 0` が false になるのは、どんなときか。

## ヒント2

ループの `{ }` の中で、`slimeHp` が一度も変わっていない。

## ヒント3

「攻撃1回ごとに HP を 6 減らす」文を足す。1回ごとなので、置く場所は `{ }` の中。

## 解説

ループの中で条件の変数が変わらないと、条件はずっと true のまま。終わらない。
中で `slimeHp` を 6 ずつ減らすと、20 → 14 → 8 → 2 → -4 と変わり、4回目のあとで条件が false になる。

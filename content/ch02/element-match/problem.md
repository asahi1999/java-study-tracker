---
id: ch02.element-match
rev: 1
type: implement
title: 属性の相性
chapter: 2
part: 6
order: 160
concepts: [string-equals, logic]
minutes: 3
goal: 3つの属性の相性表
optional: true
source: compact
judge:
  mode: output
  cases:
    - name: 9通りの相性
reviewed: true
---

## 問題

属性は火・水・草の3つ。攻める属性 `attack` と守る属性 `defense` の9通りについて、相性を出す。`// ここに書く` に書く。

- 同じ属性どうし → `ふつう`
- 火は草に、水は火に、草は水に強い → `つよい`
- それ以外 → `よわい`

できあがりはこうなる。

```text
火→火: ふつう
火→水: よわい
火→草: つよい
水→火: つよい
水→水: ふつう
水→草: よわい
草→火: よわい
草→水: つよい
草→草: ふつう
```

## ヒント1

3つに分けるので、`if`・`else if`・`else` を使う。`attack` と `defense` は文字列。

## ヒント2

文字列は `equals` で比べる。「火が草を攻める」は、`attack` が `"火"` かつ `defense` が `"草"`。

## ヒント3

`つよい` になる組は3つある。3つの「かつ」の条件を、「または」でつなぐ。

## 解説

文字列どうしは `equals` で比べる。同じ属性かどうかは、2つの変数を直接 `equals` で比べればよい。
`&&` は `||` より先に計算されるので、「A かつ B」または「C かつ D」は、そのまま並べて書ける。

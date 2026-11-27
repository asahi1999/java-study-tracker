---
id: ch02.switch-ternary
rev: 1
type: card
title: switch と三項演算子
chapter: 2
part: 2
order: 40
concepts: [switch, ternary, string-equals]
minutes: 2
source: compact
render: tiles
reviewed: true
---

## 説明

値によって結果を1つ選ぶときは、`switch` 式が短く書ける。

- `case 値 -> 結果;` … その値なら、この結果
- `case "金貨", "宝石" ->` … `,` で値を並べられる
- `default -> 結果;` … どれにも当たらないとき
- 最後の `};` の `;` を忘れない

2つから選ぶだけなら、三項演算子 `条件 ? A : B` が使える。条件が true なら A、false なら B。

文字列が同じかを比べるときは、`==` ではなく `equals` を使う。`==` は中身が同じでも false になることがある。`isEmpty()` は空の文字列 `""` なら true。

```java
void main() {
    String item = "薬";
    if (item.equals("薬")) {
        System.out.println("HP が回復した");
    }
}
```

下のコードは、拾った物 `item` をタイルの文字に変え、鍵の数で扉を選ぶ。`item` を `"金貨"` に、`keys` を `1` にして動かしてみる。

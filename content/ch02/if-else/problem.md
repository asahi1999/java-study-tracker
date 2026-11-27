---
id: ch02.if-else
rev: 1
type: card
title: 分かれ道 if
chapter: 2
part: 1
order: 10
concepts: [if, compare, else-if, logic]
minutes: 2
source: compact
render: tiles
reviewed: false
---

## 説明

`if` は分かれ道。`( )` の中の条件が `true` なら、すぐ後ろの `{ }` を動かす。`false` なら `else` の `{ }` を動かす。

条件は、比べる記号で作る。結果は `true` か `false` になる。

- `==` … 等しい（`=` は代入。比べるのは `==`）
- `!=` … 等しくない
- `<` `<=` … より小さい・以下
- `>` `>=` … より大きい・以上

3つ以上に分けるときは `else if` を足す。上から順に見て、最初に `true` になった1つだけが動く。

条件は `&&`（かつ）と `||`（または）でつなげる。`!` は「ではない」。

```java
void main() {
    int hp = 8;
    int keys = 1;
    if (hp > 0 && keys >= 1) {
        System.out.println("扉を開ける");
    }
}
```

下のコードは、鍵 `keys` が1つ以上なら、上の壁に扉 `+` を開ける。`keys` を `0` にして動かしてみる。

---
id: ch00.entrance
rev: 1
type: card
title: ダンジョンの入口
chapter: 0
part: 1
order: 10
concepts: [main, println]
minutes: 1
source: compact
render: tiles
reviewed: false
---

## 説明

Java のプログラムは `void main() { }` の `{ }` の中に書く。上の行から順に動く。

`System.out.println("#####");` は、`" "` の中の文字を1行出す。文の終わりには `;` を付ける。

出た文字は、右側でタイルになる。

- `#` … 石の壁
- `.` … 床
- `@` … 勇者（あなた）

下のコードは、3行で小さな部屋を描く。`Cmd+Enter` で実行できる。

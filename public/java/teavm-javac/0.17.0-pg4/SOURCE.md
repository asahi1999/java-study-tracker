# teavm-javac 0.17.0-pg4 の取得元

ブラウザの中で Java をコンパイル・実行するために同梱している teavm-javac の配布物。
中身は直さずに使う（`SHA256SUMS` と `npm run teavm:verify` で確かめる）。

## 取得元

| ファイル                          | 取得元                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compiler.wasm`                   | https://teavm.org/playground/4/compiler.wasm                                                                                                                  |
| `compiler.wasm-runtime.js`        | https://teavm.org/playground/4/compiler.wasm-runtime.js                                                                                                       |
| `compile-classlib-teavm.bin`      | https://teavm.org/playground/4/compile-classlib-teavm.bin                                                                                                     |
| `runtime-classlib-teavm.bin`      | https://teavm.org/playground/4/runtime-classlib-teavm.bin                                                                                                     |
| `compiler.wasm-deobfuscator.wasm` | Maven Central の `org.teavm:teavm-wasm-gc-deobfuscator:0.17.0`（`teavm-wasm-gc-deobfuscator-0.17.0.jar` の中の `deobfuscator.wasm` を、この名前にして置いた） |

- 取得日: 2026-11-27
- フォルダ名の `0.17.0-pg4` は「TeaVM 0.17.0、teavm.org の playground/4 の配布物」の意味（このリポジトリで付けた名前）

## 元になったソース

- teavm-javac: https://github.com/konsoletyper/teavm-javac
  - 取得日の最新のコミット: `b89345ad7448692ca06fc5e77dfef96eccdbea88`（2026-11-22「Switch to stable TeaVM version」）
  - playground/4 の配布物が、このコミットからビルドされたものかは確かめられない（配布物にコミットの記録がない）。取得日の時点で最新だったコミットを記録している
- TeaVM: 0.17.0（teavm-javac の `gradle/libs.versions.toml`）。https://github.com/konsoletyper/teavm
- OpenJDK の javac: https://github.com/openjdk/jdk25u のコミット `6c48f4ed707bf0b15f9b6098de30db8aae6fa40f`（teavm-javac の `gradle.properties` の `jdk.revision`。タグではなくコミットで指定されている）

## ライセンス

- 同じフォルダの [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照

## 更新するとき

1. 新しい版のフォルダ（例: `0.17.1-pg5`）を作り、ファイルを置く。古いフォルダは中身を変えない
2. `SHA256SUMS` を作り直し（`shasum -a 256 <ファイル> > SHA256SUMS`）、この SOURCE.md を書き直す
3. `src/runtime/java/assets.ts` の版を変える
4. `npm run teavm:verify` と `npm run content:verify` を通す

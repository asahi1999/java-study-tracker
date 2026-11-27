/**
 * 入力の渡し方（ブラウザ版。teavm-javac には System.setIn が無い）。
 * フェーズ2で代わりの Scanner（java/shim）を入れたら、java.util.Scanner.setInput(input) を呼ぶ（設計書 4-6）。
 * それまでは入力を渡せない。入力を読む問題は teavm-javac でコンパイルできず、content-verify が落とす。
 */
final class StdinBridge {
    private StdinBridge() {}

    static void set(String input) {
        // フェーズ2で java.util.Scanner.setInput(input) にする
    }
}

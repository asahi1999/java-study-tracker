import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

/**
 * System.out・System.err を横取りし、本当の出力とケースごとのバッファの両方に書く（設計書 5-2）。
 * 途中で止まっても（時間切れなど）、それまでの出力は本当の出力に出ている。
 * 出力の上限（標準出力と標準エラーの合計 10万文字 または 2,000行。判定の行は数えない）を超えたら、
 * limit の判定の行を出して終える（設計書 4-4）。
 */
final class JqCapture {
    static final int MAX_CHARS = 100_000;
    static final int MAX_LINES = 2_000;

    private static PrintStream realOut;
    private static PrintStream realErr;
    private static ByteArrayOutputStream caseOut;
    private static long chars;
    private static long lines;

    private JqCapture() {}

    static void install() {
        realOut = System.out;
        realErr = System.err;
        System.setOut(new PrintStream(new Tee(realOut, true), true, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(new Tee(realErr, false), true, StandardCharsets.UTF_8));
    }

    static PrintStream realErr() {
        return realErr != null ? realErr : System.err;
    }

    /** ケースの標準出力をためはじめる */
    static void begin() {
        caseOut = new ByteArrayOutputStream();
    }

    /** ためた標準出力を返して、ためるのをやめる */
    static String end() {
        System.out.flush();
        System.err.flush();
        String s = new String(caseOut.toByteArray(), StandardCharsets.UTF_8);
        caseOut = null;
        return s;
    }

    private static void count(byte[] b, int off, int len) {
        for (int i = off; i < off + len; i++) {
            int x = b[i] & 0xFF;
            if ((x & 0xC0) != 0x80) chars++; // UTF-8 の先頭のバイトだけ数える（= 文字数）
            if (x == '\n') lines++;
        }
        if (chars > MAX_CHARS || lines > MAX_LINES) {
            realOut.flush();
            realErr.flush();
            JqProtocol.limit();
            System.exit(0);
        }
    }

    private static final class Tee extends OutputStream {
        private final PrintStream target;
        private final boolean stdout;

        Tee(PrintStream target, boolean stdout) {
            this.target = target;
            this.stdout = stdout;
        }

        @Override
        public void write(int b) {
            write(new byte[] {(byte) b}, 0, 1);
        }

        @Override
        public void write(byte[] b, int off, int len) {
            count(b, off, len);
            target.write(b, off, len);
            target.flush();
            if (stdout && caseOut != null) caseOut.write(b, off, len);
        }

        @Override
        public void flush() {
            target.flush();
        }
    }
}

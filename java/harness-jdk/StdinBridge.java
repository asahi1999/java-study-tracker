import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** 入力の渡し方（JDK 版）。System.in を差し替える（設計書 5-2） */
final class StdinBridge {
    private StdinBridge() {}

    static void set(String input) {
        System.setIn(new ByteArrayInputStream(input.getBytes(StandardCharsets.UTF_8)));
    }
}

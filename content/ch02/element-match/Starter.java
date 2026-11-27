void main() {
    for (int a = 0; a < 3; a++) {
        for (int d = 0; d < 3; d++) {
            //@fold 属性の名前（読むだけ）
            String attack = switch (a) {
                case 0 -> "火";
                case 1 -> "水";
                default -> "草";
            };
            String defense = switch (d) {
                case 0 -> "火";
                case 1 -> "水";
                default -> "草";
            };
            //@end
            System.out.print(attack + "→" + defense + ": ");
            // ここに書く //@write
        }
    }
}

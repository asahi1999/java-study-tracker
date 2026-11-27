void main() {
    for (int a = 0; a < 3; a++) {
        for (int d = 0; d < 3; d++) {
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
            System.out.print(attack + "→" + defense + ": ");
            String weak = switch (attack) {
                case "火" -> "草";
                case "水" -> "火";
                default -> "水";
            };
            if (defense.equals(attack)) {
                System.out.println("ふつう");
            } else if (defense.equals(weak)) {
                System.out.println("つよい");
            } else {
                System.out.println("よわい");
            }
        }
    }
}

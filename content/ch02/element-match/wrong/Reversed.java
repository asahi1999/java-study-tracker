// expect: test
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
            if (attack.equals(defense)) {
                System.out.println("ふつう");
            } else if (attack.equals("火") && defense.equals("水")
                    || attack.equals("水") && defense.equals("草")
                    || attack.equals("草") && defense.equals("火")) {
                System.out.println("つよい");
            } else {
                System.out.println("よわい");
            }
        }
    }
}

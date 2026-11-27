void main() {
    for (int battle = 1; battle <= 5; battle++) {
        int heroHp = switch (battle) {
            case 1 -> 12;
            case 2 -> 0;
            case 3 -> 5;
            case 4 -> 3;
            default -> 0;
        };
        int monsterHp = switch (battle) {
            case 1 -> 0;
            case 2 -> 7;
            case 3 -> 4;
            case 4 -> -2;
            default -> 0;
        };
        System.out.print(battle + "戦目: ");
        if (monsterHp <= 0) {
            System.out.println("勝ち");
        } else if (heroHp <= 0) {
            System.out.println("負け");
        } else {
            System.out.println("つづく");
        }
    }
}

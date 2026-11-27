void main() {
    int hp = 35;
    int maxHp = 50;
    int full = hp * 10 / maxHp;
    int empty = 10 - full;
    System.out.println("HP " + hp + "/" + maxHp);
    System.out.println("[" + "=".repeat(full) + "-".repeat(empty) + "]");
}

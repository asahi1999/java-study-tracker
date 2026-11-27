// expect: test
void main() {
    int hp = 35;
    int maxHp = 50;
    int full = hp / 10;
    int empty = 10 - full;
    System.out.println("HP " + hp + "/" + maxHp);
    System.out.println("[" + "=".repeat(full) + "-".repeat(empty) + "]");
}

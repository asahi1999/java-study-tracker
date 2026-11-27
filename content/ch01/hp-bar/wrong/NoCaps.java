// expect: test
void main() {
    int hp = 70;
    int maxHp = 100;
    int full = hp / 10;
    int empty = (maxHp - hp) / 10;
    System.out.println("HP " + hp + "/" + maxHp);
    System.out.println("=".repeat(full) + "-".repeat(empty));
}

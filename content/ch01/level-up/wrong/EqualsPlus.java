// expect: test
void main() {
    int level = 1;
    int attack = 5;
    level++;
    attack =+ 3;
    System.out.println("Lv " + level);
    System.out.println("攻撃 " + attack);
}

// expect: compile uninitialized
void main() {
    int hp = 30;
    int damage;
    hp -= damage;
    damage = 4;
    System.out.println("HP " + hp);
}

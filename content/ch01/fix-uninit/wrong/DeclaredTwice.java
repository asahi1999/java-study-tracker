// expect: compile already-defined
void main() {
    int hp = 30;
    int damage;
    int damage = 4;
    hp -= damage;
    System.out.println("HP " + hp);
}

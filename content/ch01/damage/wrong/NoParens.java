// expect: compile
void main() {
    int attack = 7;
    int slimeGuard = 3;
    int golemGuard = 9;
    System.out.println("スライムに " + attack - slimeGuard + " のダメージ");
    System.out.println("ゴーレムに " + Math.max(attack - golemGuard, 1) + " のダメージ");
}

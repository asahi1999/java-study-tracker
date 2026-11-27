// expect: test
void main() {
    int attack = 7;
    int slimeGuard = 3;
    int golemGuard = 9;
    int toSlime = Math.min(attack - slimeGuard, 1);
    int toGolem = Math.min(attack - golemGuard, 1);
    System.out.println("スライムに " + toSlime + " のダメージ");
    System.out.println("ゴーレムに " + toGolem + " のダメージ");
}

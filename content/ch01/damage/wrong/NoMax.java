// expect: test
void main() {
    int attack = 7;
    int slimeGuard = 3;
    int golemGuard = 9;
    int toSlime = attack - slimeGuard;
    int toGolem = attack - golemGuard;
    System.out.println("スライムに " + toSlime + " のダメージ");
    System.out.println("ゴーレムに " + toGolem + " のダメージ");
}

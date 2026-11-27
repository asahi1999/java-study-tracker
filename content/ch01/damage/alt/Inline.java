void main() {
    int attack = 7;
    int slimeGuard = 3;
    int golemGuard = 9;
    System.out.println("スライムに " + Math.max(1, attack - slimeGuard) + " のダメージ");
    System.out.println("ゴーレムに " + Math.max(1, attack - golemGuard) + " のダメージ");
}

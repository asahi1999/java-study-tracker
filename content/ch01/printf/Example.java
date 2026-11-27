void main() {
    String name = "ユウ";
    int hp = 35;
    int maxHp = 50;
    System.out.printf("%s HP %d/%d%n", name, hp, maxHp);
    double rate = (double) hp / maxHp;
    System.out.printf("のこり %.1f 割%n", rate * 10);
    String line = "%s Lv%d".formatted(name, 2);
    System.out.println(line);
}

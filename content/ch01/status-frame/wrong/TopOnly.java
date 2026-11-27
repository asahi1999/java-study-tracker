// expect: test
void main() {
    String name = "yuu";
    int level = 2;
    int hp = 35;
    String line = "%s Lv%d HP%d".formatted(name.toUpperCase(), level, hp);
    System.out.println("#".repeat(line.length() + 4));
    System.out.println("# " + line + " #");
}

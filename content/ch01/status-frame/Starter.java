void main() {
    String name = "yuu";
    int level = 2;
    int hp = 35;
    String line = "%s Lv%d HP%d".formatted(name.toUpperCase(), level, hp);
    // ここに: 上の壁 //@write
    System.out.println("# " + line + " #");
    // ここに: 下の壁 //@write
}

void main() {
    String name = "yuu";
    int level = 2;
    int hp = 35;
    String line = "%s Lv%d HP%d".formatted(name.toUpperCase(), level, hp);
    String wall = "#".repeat(("# " + line + " #").length());
    System.out.println(wall);
    System.out.println("# " + line + " #");
    System.out.println(wall);
}

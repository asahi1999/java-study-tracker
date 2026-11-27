void main() {
    String found = "宝石";
    int keys = 0;
    String tile = switch (found) {
        case "金貨", "宝石" -> "$";
        case "薬" -> "!";
        default -> "?";
    };
    String door = keys > 0 ? "+" : "#";
    System.out.println("##" + door + "##");
    System.out.println("#." + tile + ".#");
    System.out.println("#####");
}

void main() {
    String item = "薬";
    String tile = switch (item) {
        case "金貨" -> "$";
        case "薬" -> "!";
        default -> "?";
    };
    int keys = 0;
    String door = keys >= 1 ? "+" : "#";
    System.out.println("##" + door + "##");
    System.out.println("#." + tile + ".#");
    System.out.println("#####");
}

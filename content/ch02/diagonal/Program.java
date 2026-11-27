void main() {
    for (int y = 0; y < 3; y++) {
        for (int x = 0; x < 4; x++) {
            if (x == y) {
                System.out.print("*");
                continue;
            }
            System.out.print(".");
        }
        System.out.println();
    }
}

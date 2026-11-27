void main() {
    for (int y = 0; y < 4; y++) {
        for (int x = 0; x < 8; x++) {
            if (y % 2 == 0) {
                System.out.print(x % 2 == 0 ? "." : "%");
            } else {
                System.out.print(x % 2 == 0 ? "%" : ".");
            }
        }
        System.out.println();
    }
}

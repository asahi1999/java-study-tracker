void main() {
    for (int y = 0; y < 3; y++) {
        for (int x = 0; x < 5; x++) {
            if (x == 2 && y == 1) {
                System.out.print("@");
            } else {
                System.out.print(".");
            }
        }
        System.out.println();
    }
}

void main() {
    for (int y = 0; y < 5; y++) {
        for (int x = 0; x < 9; x++) {
            if (false) { //@write
                System.out.print("+");
            } else if (y == 0 || y == 4 || x == 0 || x == 8) {
                System.out.print("#");
            } else {
                System.out.print(".");
            }
        }
        System.out.println();
    }
}

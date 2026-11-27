// expect: test
void main() {
    for (int y = 0; y < 5; y++) {
        for (int x = 0; x < 9; x++) {
            if (y == 0 || y == 4) {
                System.out.print("#");
            } else {
                System.out.print(".");
            }
        }
        System.out.println();
    }
}

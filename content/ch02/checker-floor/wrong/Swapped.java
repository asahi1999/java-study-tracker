// expect: test
void main() {
    for (int y = 0; y < 4; y++) {
        for (int x = 0; x < 8; x++) {
            if ((x + y) % 2 == 1) {
                System.out.print(".");
            } else {
                System.out.print("%");
            }
        }
        System.out.println();
    }
}

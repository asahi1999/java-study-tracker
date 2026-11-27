// expect: test
void main() {
    for (int y = 0; y < 4; y++) {
        for (int x = 0; x < 8; x++) {
            if (x % 2 == 0) {
                System.out.print(".");
            } else {
                System.out.print("%");
            }
        }
        System.out.println();
    }
}

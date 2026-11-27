// expect: test
void main() {
    int chest = 5;
    System.out.print("#");
    for (int x = 0; x < 10; x++) {
        if (x == chest) {
            System.out.print("&");
            continue;
        }
        System.out.print(".");
    }
    System.out.println("#");
}

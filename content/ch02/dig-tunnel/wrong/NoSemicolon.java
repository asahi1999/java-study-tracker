// expect: compile semicolon-expected
void main() {
    int chest = 5;
    System.out.print("#");
    for (int x = 0; x < 10; x++) {
        if (x == chest) {
            System.out.print("&");
            break
        }
        System.out.print(".");
    }
    System.out.println("#");
}

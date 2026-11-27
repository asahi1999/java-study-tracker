// expect: test
void main() {
    for (int x = 0; x < 11; x++) {
        if (x % 3 == 2) {
            System.out.println("*");
        } else {
            System.out.println("#");
        }
    }
    System.out.println();
    System.out.println("#.........#");
    System.out.println("#....@....#");
    System.out.println("###########");
}

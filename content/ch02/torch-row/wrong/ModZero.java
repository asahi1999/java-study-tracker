// expect: test
void main() {
    for (int x = 0; x < 11; x++) {
        if (x % 3 == 0) {
            System.out.print("*");
        } else {
            System.out.print("#");
        }
    }
    System.out.println();
    System.out.println("#.........#");
    System.out.println("#....@....#");
    System.out.println("###########");
}

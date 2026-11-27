// expect: test
void main() {
    int slimeHp = 20;
    int hits = 0;
    while (slimeHp > 0) {
        hits++;
        slimeHp--;
    }
    System.out.println("たおすまでに " + hits + " 回");
}

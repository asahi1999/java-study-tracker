// expect: timeout
void main() {
    int slimeHp = 20;
    int hits = 0;
    while (slimeHp > 0) {
        hits++;
    }
    slimeHp -= 6;
    System.out.println("たおすまでに " + hits + " 回");
}

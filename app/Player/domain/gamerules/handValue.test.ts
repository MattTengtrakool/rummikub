import { handValue } from "@/app/Player/domain/gamerules/handValue";
import { describe, expect, test } from "vitest";

describe("handValue", () => {
  test("sum card numbers", () => {
    expect(
      handValue([
        { color: "blue", number: 5, duplicata: 1 },
        { color: "red", number: 10, duplicata: 1 },
      ]),
    ).toBe(15);
  });

  test("joker is worth 30 points", () => {
    expect(
      handValue([{ color: "black", number: 0, duplicata: 1 }]),
    ).toBe(30);
  });

  test("mixed hand with joker", () => {
    expect(
      handValue([
        { color: "red", number: 7, duplicata: 1 },
        { color: "black", number: 0, duplicata: 2 },
        { color: "blue", number: 3, duplicata: 1 },
      ]),
    ).toBe(40);
  });

  test("empty hand is 0", () => {
    expect(handValue([])).toBe(0);
  });
});

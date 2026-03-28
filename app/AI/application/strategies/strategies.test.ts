import type { CardDto, CardColor } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { describe, expect, test } from "vitest";
import { easyStrategy } from "@/app/AI/application/strategies/easyStrategy";
import { mediumStrategy } from "@/app/AI/application/strategies/mediumStrategy";
import { hardStrategy } from "@/app/AI/application/strategies/hardStrategy";

const card = (color: CardColor, number: number, duplicata: 1 | 2 = 1): CardDto =>
  ({ color, number, duplicata }) as CardDto;

const tile = (x: number, y: number, c: CardDto): PlacedTileDto => ({ x, y, card: c });

const joker = (duplicata: 1 | 2 = 1): CardDto =>
  ({ color: "red", number: 0, duplicata }) as CardDto;

describe("AI strategies", () => {
  describe("easyStrategy", () => {
    test("plays a valid combination from hand", () => {
      const hand = [card("red", 10), card("red", 11), card("red", 12), card("blue", 3)];
      const result = easyStrategy(hand, [], true);

      expect(result.action).toBe("play");
      if (result.action === "play") {
        expect(result.moves.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("draws when nothing playable", () => {
      const hand = [card("red", 1), card("blue", 5), card("black", 13)];
      const result = easyStrategy(hand, [], true);

      expect(result.action).toBe("draw");
    });

    test("draws when first meld below 30", () => {
      const hand = [card("red", 1), card("red", 2), card("red", 3)];
      const result = easyStrategy(hand, [], false);

      expect(result.action).toBe("draw");
    });

    test("plays opening when >= 30 points", () => {
      const hand = [card("red", 10), card("red", 11), card("red", 12)];
      const result = easyStrategy(hand, [], false);

      expect(result.action).toBe("play");
    });
  });

  describe("mediumStrategy", () => {
    test("plays combinations from hand", async () => {
      const hand = [card("red", 10), card("red", 11), card("red", 12), card("blue", 3)];
      const result = await mediumStrategy(hand, [], true);

      expect(result.action).toBe("play");
    });

    test("extends existing board combination", async () => {
      const boardTiles = [
        tile(0, 0, card("blue", 5)),
        tile(1, 0, card("blue", 6)),
        tile(2, 0, card("blue", 7)),
      ];
      const hand = [card("blue", 8), card("red", 1)];
      const result = await mediumStrategy(hand, boardTiles, true);

      expect(result.action).toBe("play");
      if (result.action === "play") {
        expect(result.moves.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("draws when nothing playable", async () => {
      const hand = [card("red", 1), card("blue", 5)];
      const result = await mediumStrategy(hand, [], true);

      expect(result.action).toBe("draw");
    });
  });

  describe("hardStrategy", () => {
    test("plays combinations from hand", async () => {
      const hand = [
        card("red", 10),
        card("red", 11),
        card("red", 12),
        card("blue", 3),
      ];
      const result = await hardStrategy(hand, [], true);

      expect(result.action).toBe("play");
    });

    test("draws when nothing playable", async () => {
      const hand = [card("red", 1), card("blue", 5)];
      const result = await hardStrategy(hand, [], true);

      expect(result.action).toBe("draw");
    });

    test("plays opening when >= 30 points", async () => {
      const hand = [card("red", 10), card("red", 11), card("red", 12)];
      const result = await hardStrategy(hand, [], false);

      expect(result.action).toBe("play");
    });

    test("handles joker in hand", async () => {
      const hand = [card("red", 5), joker(), card("red", 7)];
      const result = await hardStrategy(hand, [], true);

      expect(result.action).toBe("play");
    });
  });
});

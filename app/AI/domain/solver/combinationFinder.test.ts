import type { CardDto, CardColor } from "@/app/Card/domain/dtos/card";
import { describe, expect, test } from "vitest";
import {
  findAllCandidateCombinations,
  buildTilePool,
} from "@/app/AI/domain/solver/combinationFinder";

const card = (color: CardColor, number: number, duplicata: 1 | 2 = 1): CardDto =>
  ({ color, number, duplicata }) as CardDto;

const joker = (duplicata: 1 | 2 = 1): CardDto =>
  ({ color: "red", number: 0, duplicata }) as CardDto;

describe("combinationFinder", () => {
  describe("findAllCandidateCombinations", () => {
    test("finds a simple suite of 3", () => {
      const hand = [card("red", 1), card("red", 2), card("red", 3)];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);

      const suites = combos.filter((c) => c.type === "suite");
      expect(suites.length).toBeGreaterThanOrEqual(1);

      const hasSuite123 = suites.some(
        (c) =>
          c.tiles.length === 3 &&
          c.tiles.every((t) => t.card.color === "red"),
      );
      expect(hasSuite123).toBe(true);
    });

    test("finds a simple serie of 3", () => {
      const hand = [card("red", 5), card("blue", 5), card("black", 5)];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);

      const series = combos.filter((c) => c.type === "serie");
      expect(series.length).toBeGreaterThanOrEqual(1);

      const hasSerie = series.some(
        (c) =>
          c.tiles.length === 3 &&
          c.tiles.every((t) => t.card.number === 5),
      );
      expect(hasSerie).toBe(true);
    });

    test("finds suite with joker filling a gap", () => {
      const hand = [card("blue", 4), joker(), card("blue", 6)];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);

      const suites = combos.filter((c) => c.type === "suite");
      expect(suites.length).toBeGreaterThanOrEqual(1);
    });

    test("finds serie of 4", () => {
      const hand = [
        card("red", 7),
        card("blue", 7),
        card("black", 7),
        card("yellow", 7),
      ];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);

      const series4 = combos.filter(
        (c) => c.type === "serie" && c.tiles.length === 4,
      );
      expect(series4.length).toBeGreaterThanOrEqual(1);
    });

    test("returns empty for no valid combinations", () => {
      const hand = [card("red", 1), card("blue", 5), card("black", 13)];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);
      expect(combos.length).toBe(0);
    });

    test("finds longer suites", () => {
      const hand = [
        card("red", 1),
        card("red", 2),
        card("red", 3),
        card("red", 4),
        card("red", 5),
      ];
      const pool = buildTilePool(hand);
      const combos = findAllCandidateCombinations(pool);

      const longSuites = combos.filter(
        (c) => c.type === "suite" && c.tiles.length >= 4,
      );
      expect(longSuites.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("buildTilePool", () => {
    test("marks hand tiles correctly", () => {
      const hand = [card("red", 1), card("blue", 2)];
      const pool = buildTilePool(hand);

      expect(pool).toHaveLength(2);
      expect(pool[0].fromHand).toBe(true);
      expect(pool[1].fromHand).toBe(true);
    });

    test("marks board tiles correctly", () => {
      const hand = [card("red", 1)];
      const board = [card("blue", 2)];
      const pool = buildTilePool(hand, board);

      expect(pool).toHaveLength(2);
      expect(pool[0].fromHand).toBe(true);
      expect(pool[1].fromHand).toBe(false);
    });
  });
});

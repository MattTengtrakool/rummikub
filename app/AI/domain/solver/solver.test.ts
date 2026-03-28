import type { CardDto, CardColor } from "@/app/Card/domain/dtos/card";
import { describe, expect, test } from "vitest";
import { solve, solveGreedy } from "@/app/AI/domain/solver/solver";

const card = (color: CardColor, number: number, duplicata: 1 | 2 = 1): CardDto =>
  ({ color, number, duplicata }) as CardDto;

const joker = (duplicata: 1 | 2 = 1): CardDto =>
  ({ color: "red", number: 0, duplicata }) as CardDto;

describe("solver", () => {
  describe("solveGreedy", () => {
    test("finds a single valid combination from hand", () => {
      const hand = [
        card("red", 10),
        card("red", 11),
        card("red", 12),
        card("blue", 3),
      ];
      const result = solveGreedy(hand, { hasStarted: true });

      expect(result.handTilesUsed).toBe(3);
      expect(result.combinations).toHaveLength(1);
    });

    test("returns empty when no valid combination exists", () => {
      const hand = [
        card("red", 1),
        card("blue", 5),
        card("black", 13),
      ];
      const result = solveGreedy(hand, { hasStarted: true });

      expect(result.handTilesUsed).toBe(0);
    });

    test("respects 30-point opening threshold", () => {
      const hand = [
        card("red", 1),
        card("red", 2),
        card("red", 3),
      ];
      const result = solveGreedy(hand, { hasStarted: false });

      expect(result.handTilesUsed).toBe(0);
    });

    test("plays opening when total >= 30 points", () => {
      const hand = [
        card("red", 10),
        card("red", 11),
        card("red", 12),
      ];
      const result = solveGreedy(hand, { hasStarted: false });

      expect(result.handTilesUsed).toBe(3);
      expect(result.pointsAdded).toBeGreaterThanOrEqual(30);
    });

    test("combines multiple groups to reach 30 opening points", () => {
      const hand = [
        card("red", 5),
        card("red", 6),
        card("red", 7),
        card("blue", 4),
        card("black", 4),
        card("yellow", 4),
      ];
      const result = solveGreedy(hand, { hasStarted: false });

      expect(result.handTilesUsed).toBeGreaterThanOrEqual(3);
      expect(result.pointsAdded).toBeGreaterThanOrEqual(30);
    });
  });

  describe("solve (backtracking)", () => {
    test("finds optimal play maximizing hand tiles used", () => {
      const hand = [
        card("red", 1),
        card("red", 2),
        card("red", 3),
        card("blue", 1),
        card("black", 1),
        card("yellow", 1),
      ];
      const result = solve(hand, [], {
        hasStarted: true,
        includeBoard: false,
        maxSearchNodes: 5000,
      });

      expect(result.handTilesUsed).toBe(6);
      expect(result.combinations).toHaveLength(2);
    });

    test("returns empty when nothing playable", () => {
      const hand = [card("red", 1), card("blue", 7)];
      const result = solve(hand, [], {
        hasStarted: true,
        includeBoard: false,
      });

      expect(result.handTilesUsed).toBe(0);
    });

    test("handles joker in hand", () => {
      const hand = [
        card("red", 5),
        joker(),
        card("red", 7),
      ];
      const result = solve(hand, [], {
        hasStarted: true,
        includeBoard: false,
      });

      expect(result.handTilesUsed).toBe(3);
    });

    test("with board tiles: must keep all board tiles valid", () => {
      const hand = [card("red", 4)];
      const board = [card("red", 1), card("red", 2), card("red", 3)];

      const result = solve(hand, board, {
        hasStarted: true,
        includeBoard: true,
        maxSearchNodes: 5000,
      });

      if (result.handTilesUsed > 0) {
        const allBoardCovered = result.combinations.reduce(
          (count, c) => count + c.boardTileIndices.length,
          0,
        );
        expect(allBoardCovered).toBe(board.length);
      }
    });
  });
});

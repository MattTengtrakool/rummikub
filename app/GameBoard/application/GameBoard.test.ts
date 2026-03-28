import { GameBoard } from "@/app/GameBoard/application/GameBoard";
import { describe, expect, test } from "vitest";

describe("GameBoard", () => {
  describe("turn", () => {
    test("can cancel modifications", () => {
      const gameBoard = new GameBoard({});

      gameBoard.beginTurn();
      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.cancelTurnModifications();

      const dto = gameBoard.toDto();
      expect(dto.tiles).toStrictEqual([]);
      expect(dto.isValid).toBe(true);
      expect(dto.hasModifications).toBe(false);
      expect(dto.points).toBe(0);
      expect(dto.turnPoints).toBe(0);
    });

    test("can compute turn points", () => {
      const gameBoard = new GameBoard({});

      gameBoard.beginTurn();
      gameBoard.placeCard({ color: "yellow", number: 10, duplicata: 1 }, { x: 0, y: 0 });

      expect(gameBoard.turnPoints()).toBe(10);
    });

    test("cannot end turn if game board is not valid", () => {
      const gameBoard = new GameBoard({});

      gameBoard.beginTurn();
      gameBoard.placeCard({ color: "yellow", number: 10, duplicata: 1 }, { x: 0, y: 0 });

      expect(() => gameBoard.endTurn()).toThrow(Error);
    });

    test("can end turn if game board is valid", () => {
      const gameBoard = new GameBoard({});

      gameBoard.beginTurn();
      gameBoard.endTurn();
    });
  });

  describe("placeCard", () => {
    test("place a card at position", () => {
      const gameBoard = new GameBoard({});

      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 0, y: 0 });

      expect(gameBoard.toDto().tiles).toHaveLength(1);
      expect(gameBoard.toDto().tiles[0].card).toStrictEqual({
        color: "black",
        number: 7,
        duplicata: 1,
      });
    });

    test("snap to adjacent position when dropping on occupied spot", () => {
      const gameBoard = new GameBoard({});

      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.placeCard({ color: "red", number: 5, duplicata: 1 }, { x: 0, y: 0 });

      expect(gameBoard.toDto().tiles).toHaveLength(2);
      const positions = gameBoard.toDto().tiles.map((t) => ({ x: t.x, y: t.y }));
      expect(positions[0]).not.toStrictEqual(positions[1]);
    });
  });

  describe("moveCard", () => {
    test("move a card from one position to another", () => {
      const gameBoard = new GameBoard({});

      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.moveCard({ x: 0, y: 0 }, { x: 5, y: 5 });

      expect(gameBoard.toDto().tiles).toHaveLength(1);
      expect(gameBoard.toDto().tiles[0].card).toStrictEqual({
        color: "black",
        number: 7,
        duplicata: 1,
      });
    });

    test("throw if source has no tile", () => {
      const gameBoard = new GameBoard({});

      expect(() =>
        gameBoard.moveCard({ x: 0, y: 0 }, { x: 5, y: 5 }),
      ).toThrow("No tile at source position");
    });
  });

  describe("removeCard", () => {
    test("remove a card and return it", () => {
      const gameBoard = new GameBoard({});
      const card = { color: "black" as const, number: 7 as const, duplicata: 1 as const };

      gameBoard.placeCard(card, { x: 0, y: 0 });
      const removed = gameBoard.removeCard({ x: 0, y: 0 });

      expect(removed).toStrictEqual(card);
      expect(gameBoard.toDto().tiles).toHaveLength(0);
    });
  });

  describe("isValid", () => {
    test("empty board is valid", () => {
      const gameBoard = new GameBoard({});
      expect(gameBoard.isValid()).toBe(true);
    });

    test("single tile is invalid", () => {
      const gameBoard = new GameBoard({});
      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 0, y: 0 });
      expect(gameBoard.isValid()).toBe(false);
    });

    test("valid suite is valid", () => {
      const gameBoard = new GameBoard({});
      gameBoard.placeCard({ color: "black", number: 5, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.placeCard({ color: "black", number: 6, duplicata: 1 }, { x: 1, y: 0 });
      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 2, y: 0 });
      expect(gameBoard.isValid()).toBe(true);
    });

    test("valid serie is valid", () => {
      const gameBoard = new GameBoard({});
      gameBoard.placeCard({ color: "black", number: 5, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.placeCard({ color: "red", number: 5, duplicata: 1 }, { x: 1, y: 0 });
      gameBoard.placeCard({ color: "blue", number: 5, duplicata: 1 }, { x: 2, y: 0 });
      expect(gameBoard.isValid()).toBe(true);
    });
  });

  describe("combination detection", () => {
    test("detects separate combinations on different rows", () => {
      const gameBoard = new GameBoard({});
      gameBoard.placeCard({ color: "black", number: 5, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.placeCard({ color: "black", number: 6, duplicata: 1 }, { x: 1, y: 0 });
      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 2, y: 0 });

      gameBoard.placeCard({ color: "red", number: 5, duplicata: 1 }, { x: 0, y: 2 });
      gameBoard.placeCard({ color: "blue", number: 5, duplicata: 1 }, { x: 1, y: 2 });
      gameBoard.placeCard({ color: "yellow", number: 5, duplicata: 1 }, { x: 2, y: 2 });

      expect(gameBoard.toDto().combinations).toHaveLength(2);
      expect(gameBoard.isValid()).toBe(true);
    });

    test("detects separate combinations on same row with gap", () => {
      const gameBoard = new GameBoard({});
      gameBoard.placeCard({ color: "black", number: 5, duplicata: 1 }, { x: 0, y: 0 });
      gameBoard.placeCard({ color: "black", number: 6, duplicata: 1 }, { x: 1, y: 0 });
      gameBoard.placeCard({ color: "black", number: 7, duplicata: 1 }, { x: 2, y: 0 });

      gameBoard.placeCard({ color: "red", number: 1, duplicata: 1 }, { x: 5, y: 0 });
      gameBoard.placeCard({ color: "blue", number: 1, duplicata: 1 }, { x: 6, y: 0 });
      gameBoard.placeCard({ color: "yellow", number: 1, duplicata: 1 }, { x: 7, y: 0 });

      expect(gameBoard.toDto().combinations).toHaveLength(2);
      expect(gameBoard.isValid()).toBe(true);
    });
  });

  describe("hasModifications", () => {
    test("should return true when tiles have changed", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 4, duplicata: 1 } },
          { x: 1, y: 0, card: { color: "red", number: 4, duplicata: 1 } },
        ],
      });

      gameBoard.beginTurn();
      gameBoard.moveCard({ x: 0, y: 0 }, { x: 5, y: 5 });

      expect(gameBoard.hasModifications()).toBe(true);
    });

    test("should return false when no changes", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 4, duplicata: 1 } },
        ],
      });

      gameBoard.beginTurn();

      expect(gameBoard.hasModifications()).toBe(false);
    });
  });
});

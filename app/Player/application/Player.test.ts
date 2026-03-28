import { DrawStack } from "@/app/DrawStack/application/DrawStack";
import { GameBoard } from "@/app/GameBoard/application/GameBoard";
import { Player } from "@/app/Player/application/Player";
import { describe, expect, test } from "vitest";

const startupCards = Object.freeze([
  Object.freeze({ color: "black", number: 0, duplicata: 1 }),
  Object.freeze({ color: "black", number: 1, duplicata: 1 }),
  Object.freeze({ color: "black", number: 2, duplicata: 1 }),
  Object.freeze({ color: "black", number: 3, duplicata: 1 }),
  Object.freeze({ color: "black", number: 4, duplicata: 1 }),
  Object.freeze({ color: "black", number: 5, duplicata: 1 }),
  Object.freeze({ color: "black", number: 6, duplicata: 1 }),
  Object.freeze({ color: "black", number: 7, duplicata: 1 }),
  Object.freeze({ color: "black", number: 8, duplicata: 1 }),
  Object.freeze({ color: "black", number: 9, duplicata: 1 }),
  Object.freeze({ color: "black", number: 10, duplicata: 1 }),
  Object.freeze({ color: "black", number: 11, duplicata: 1 }),
  Object.freeze({ color: "black", number: 12, duplicata: 1 }),
  Object.freeze({ color: "black", number: 13, duplicata: 1 }),
]);

describe("Player", () => {
  describe("drawStartupCards", () => {
    test("add startup cards to player", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [...startupCards],
        }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 2, duplicata: 1 }],
      });

      player.drawStartupCards();

      expect(player.toDto().cards).toStrictEqual([
        { color: "black", number: 2, duplicata: 1 },
        ...startupCards,
      ]);
    });

    test("cannot draw startup cards twice", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [...startupCards],
        }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 2, duplicata: 1 }],
      });

      player.drawStartupCards();

      expect(() => player.drawStartupCards()).toThrow(Error);
    });
  });

  describe("drawCard", () => {
    test("add card picked from draw stack", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "black", number: 1, duplicata: 1 }],
        }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 2, duplicata: 1 }],
      });

      player.beginTurn();
      player.drawCard();

      expect(player.toDto().cards).toStrictEqual([
        { color: "black", number: 2, duplicata: 1 },
        { color: "black", number: 1, duplicata: 1 },
      ]);
    });
  });

  describe("endTurn", () => {
    test("throw error if game board is not valid", () => {
      const player = new Player({
        id: "player",
        hasStarted: true,
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
        cards: [
          { color: "black", number: 10, duplicata: 1 },
          { color: "black", number: 11, duplicata: 1 },
          { color: "red", number: 12, duplicata: 1 },
        ],
      });

      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });
      player.placeCard(0, { x: 1, y: 0 });
      player.placeCard(0, { x: 2, y: 0 });

      expect(() => player.endTurn()).toThrow("Game board is not valid");
    });

    test("throw error if started player has not played points", () => {
      const player = new Player({
        id: "player",
        hasStarted: true,
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 2, duplicata: 1 }],
      });

      player.beginTurn();
      expect(() => player.endTurn()).toThrow("No points played");
    });

    test("throw error if unstarted player has not played enough points to start", () => {
      const player = new Player({
        id: "player",
        hasStarted: false,
        gameBoard: new GameBoard({}),
        drawStack: new DrawStack({}),
        cards: [
          { color: "black", number: 1, duplicata: 1 },
          { color: "black", number: 2, duplicata: 1 },
          { color: "black", number: 3, duplicata: 1 },
        ],
      });

      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });
      player.placeCard(0, { x: 1, y: 0 });
      player.placeCard(0, { x: 2, y: 0 });
      expect(() => player.endTurn()).toThrow("Not enough points to start");
    });

    test("mark user as started if it's his first turn", () => {
      const player = new Player({
        id: "player",
        hasStarted: false,
        gameBoard: new GameBoard({}),
        drawStack: new DrawStack({}),
        cards: [
          { color: "black", number: 10, duplicata: 1 },
          { color: "black", number: 11, duplicata: 1 },
          { color: "black", number: 12, duplicata: 1 },
        ],
      });

      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });
      player.placeCard(0, { x: 1, y: 0 });
      player.placeCard(0, { x: 2, y: 0 });

      player.endTurn();
      expect(player.toDto().hasStarted).toBeTruthy();
    });
  });

  describe("isPlaying", () => {
    test("return true when player turn began", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
      });

      player.beginTurn();

      expect(player.isPlaying()).toBeTruthy();
    });

    test("return true when player turn ended", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
      });

      player.beginTurn();
      player.drawCard();

      expect(player.isPlaying()).toBeFalsy();
    });
  });

  describe("hasWon", () => {
    test("return true when player has drawn startup cards and has placed everything", () => {
      const player = new Player({
        id: "player",
        hasDrawnStartupCards: true,
        gameBoard: new GameBoard({}),
        drawStack: new DrawStack({}),
      });

      expect(player.hasWon()).toBeTruthy();
    });
  });

  describe("cancelTurnModifications", () => {
    test("remove cards from gameBoard", () => {
      const gameBoard = new GameBoard({});
      const player = new Player({
        id: "player",
        hasDrawnStartupCards: true,
        gameBoard,
        drawStack: new DrawStack({}),
        cards: [{ color: "black", number: 7, duplicata: 1 }],
      });
      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });

      player.cancelTurnModifications();

      expect(gameBoard.toDto().tiles).toHaveLength(0);
    });
    test("put back placed cards", () => {
      const gameBoard = new GameBoard({});
      const player = new Player({
        id: "player",
        hasDrawnStartupCards: true,
        gameBoard,
        drawStack: new DrawStack({}),
        cards: [{ color: "black", number: 7, duplicata: 1 }],
      });
      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });

      player.cancelTurnModifications();

      expect(player.toDto().cards).toHaveLength(1);
    });
  });

  describe("canDrawCard", () => {
    test("return false when draw stack is empty", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({ cards: [] }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();

      expect(player.canDrawCard()).toBe(false);
    });

    test("return true when playing and stack has cards", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "red", number: 5, duplicata: 1 }],
        }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();

      expect(player.canDrawCard()).toBe(true);
    });

    test("return false when player placed a card from hand", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "red", number: 5, duplicata: 1 }],
        }),
        gameBoard: new GameBoard({}),
        cards: [
          { color: "black", number: 10, duplicata: 1 },
          { color: "black", number: 11, duplicata: 1 },
        ],
      });

      player.beginTurn();
      player.placeCard(0, { x: 0, y: 0 });

      expect(player.canDrawCard()).toBe(false);
    });

    test("return true when player only rearranged board tiles and board is valid", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 1, duplicata: 1 } },
          { x: 1, y: 0, card: { color: "black", number: 2, duplicata: 1 } },
          { x: 2, y: 0, card: { color: "black", number: 3, duplicata: 1 } },
          { x: 0, y: 1, card: { color: "black", number: 4, duplicata: 1 } },
          { x: 1, y: 1, card: { color: "black", number: 5, duplicata: 1 } },
          { x: 2, y: 1, card: { color: "black", number: 6, duplicata: 1 } },
          { x: 3, y: 1, card: { color: "black", number: 7, duplicata: 1 } },
        ],
      });
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "red", number: 5, duplicata: 1 }],
        }),
        gameBoard,
        cards: [{ color: "black", number: 13, duplicata: 1 }],
      });

      player.beginTurn();
      player.moveCard({ x: 0, y: 1 }, { x: 3, y: 0 });

      expect(player.canDrawCard()).toBe(true);
    });

    test("return false when player rearranged board tiles into invalid state", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 10, duplicata: 1 } },
          { x: 1, y: 0, card: { color: "black", number: 11, duplicata: 1 } },
          { x: 2, y: 0, card: { color: "black", number: 12, duplicata: 1 } },
        ],
      });
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "red", number: 5, duplicata: 1 }],
        }),
        gameBoard,
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();
      player.moveCard({ x: 2, y: 0 }, { x: 5, y: 5 });

      expect(player.canDrawCard()).toBe(false);
    });
  });

  describe("canPass", () => {
    test("return true when playing and draw stack is empty", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({ cards: [] }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();

      expect(player.canPass()).toBe(true);
    });

    test("return false when draw stack has cards", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({
          cards: [{ color: "red", number: 5, duplicata: 1 }],
        }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();

      expect(player.canPass()).toBe(false);
    });

    test("return false when not playing", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({ cards: [] }),
        gameBoard: new GameBoard({}),
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      expect(player.canPass()).toBe(false);
    });

    test("return true when player only rearranged board tiles and board is valid", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 1, duplicata: 1 } },
          { x: 1, y: 0, card: { color: "black", number: 2, duplicata: 1 } },
          { x: 2, y: 0, card: { color: "black", number: 3, duplicata: 1 } },
          { x: 0, y: 1, card: { color: "black", number: 4, duplicata: 1 } },
          { x: 1, y: 1, card: { color: "black", number: 5, duplicata: 1 } },
          { x: 2, y: 1, card: { color: "black", number: 6, duplicata: 1 } },
          { x: 3, y: 1, card: { color: "black", number: 7, duplicata: 1 } },
        ],
      });
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({ cards: [] }),
        gameBoard,
        cards: [{ color: "black", number: 13, duplicata: 1 }],
      });

      player.beginTurn();
      player.moveCard({ x: 0, y: 1 }, { x: 3, y: 0 });

      expect(player.canPass()).toBe(true);
    });

    test("return false when player rearranged board tiles into invalid state", () => {
      const gameBoard = new GameBoard({
        tiles: [
          { x: 0, y: 0, card: { color: "black", number: 10, duplicata: 1 } },
          { x: 1, y: 0, card: { color: "black", number: 11, duplicata: 1 } },
          { x: 2, y: 0, card: { color: "black", number: 12, duplicata: 1 } },
        ],
      });
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({ cards: [] }),
        gameBoard,
        cards: [{ color: "black", number: 1, duplicata: 1 }],
      });

      player.beginTurn();
      player.moveCard({ x: 2, y: 0 }, { x: 5, y: 5 });

      expect(player.canPass()).toBe(false);
    });
  });

  describe("handValue", () => {
    test("return sum of card numbers", () => {
      const player = new Player({
        id: "player",
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
        cards: [
          { color: "black", number: 5, duplicata: 1 },
          { color: "red", number: 8, duplicata: 1 },
        ],
      });

      expect(player.handValue()).toBe(13);
    });
  });

  describe("toDto", () => {
    test("return corresponding dto", () => {
      const player = new Player({
        id: "player",
        username: "bob",
        drawStack: new DrawStack({}),
        gameBoard: new GameBoard({}),
        cards: [
          { color: "black", number: 2, duplicata: 1 },
          { color: "black", number: 1, duplicata: 1 },
        ],
      });

      expect(player.toDto()).toStrictEqual({
        id: "player",
        username: "bob",
        admin: false,
        cards: [
          { color: "black", number: 2, duplicata: 1 },
          { color: "black", number: 1, duplicata: 1 },
        ],
        isPlaying: false,
        hasDrawnStartupCards: false,
        hasStarted: false,
        hasDrawnThisTurn: false,
        hasWon: false,
        canStartGame: false,
        canDrawCard: false,
        canPlaceCard: false,
        canMoveCard: false,
        canReturnCard: false,
        canCancelTurnModifications: false,
        canUndoLastAction: false,
        canEndTurn: false,
        canPass: false,
        handValue: 3,
        isAI: false,
        aiDifficulty: undefined,
      });
    });
  });
});

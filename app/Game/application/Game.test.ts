import { DrawStack } from "@/app/DrawStack/application/DrawStack";
import { Game } from "@/app/Game/application/Game";
import { GameBoard } from "@/app/GameBoard/application/GameBoard";
import { describe, expect, test, vi } from "vitest";

describe("Game", () => {
  describe("addPlayer", () => {
    test("create new player", () => {
      const game = new Game({ id: "game", generateUserId: () => "player" });

      game.addPlayer();

      expect(game.toDto().players).toHaveLength(1);
    });

    test("first player is admin", () => {
      const game = new Game({ id: "game" });

      const firstPlayer = game.addPlayer();
      const secondPlayer = game.addPlayer();

      expect(firstPlayer.admin).toBe(true);
      expect(secondPlayer.admin).toBe(false);
    });

    test("can't add more than 6 players", () => {
      const game = new Game({ id: "game" });

      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();

      expect(() => game.addPlayer()).toThrow("Max players limit reached");
    });

    test("can't add player if game started", () => {
      const game = new Game({ id: "game", state: "started" });

      expect(() => game.addPlayer()).toThrow("Game has started");
    });

    test("can't add player if game ended", () => {
      const game = new Game({ id: "game", state: "ended" });

      expect(() => game.addPlayer()).toThrow("Game has started");
    });
  });

  describe("findOrAddPlayer", () => {
    test("create player with specified username and return it", () => {
      const game = new Game({ id: "1" });

      const player = game.findOrAddPlayer({ username: "testman" });

      expect(player.username).toBe("testman");
    });

    test("if already exist, find player with specified username and return it", () => {
      const game = new Game({ id: "1" });
      const alreadyExistentPlayer = game.addPlayer({ username: "testman" });

      const player = game.findOrAddPlayer({ username: "testman" });

      expect(game.playerCount).toBe(1);
      expect(alreadyExistentPlayer.id).toBe(player.id);
    });
  });

  describe("removePlayer", () => {
    test("throw error if unknown player id", () => {
      const game = new Game({ id: "game", generateUserId: () => "player" });

      expect(() => game.removePlayer("e")).toThrow("Unknown player id");
    });

    test("remove player", () => {
      const game = new Game({ id: "game", generateUserId: () => "player" });
      const player = game.addPlayer();

      game.removePlayer(player.id);

      expect(game.toDto().players).toHaveLength(0);
    });

    test("make admin player after if admin leave game", () => {
      const game = new Game({ id: "game", generateUserId: () => "player" });
      const admin = game.addPlayer();
      const guest = game.addPlayer();

      game.removePlayer(admin.id);

      expect(guest.admin).toBe(true);
    });

    test("remove player end the game if started", () => {
      const game = new Game({ id: "game", state: "created" });
      const player = game.addPlayer();
      game.addPlayer();
      game.start();

      game.removePlayer(player.id);
      expect(() => game.isEnded()).toBeTruthy();
    });
  });

  describe("isFull", () => {
    test("return false when less than 6 players", () => {
      const game = new Game({ id: "game" });

      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();

      expect(game.isFull()).toBeFalsy();
    });

    test("return true when 6 players", () => {
      const game = new Game({ id: "game" });

      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();

      expect(game.isFull()).toBeTruthy();
    });
  });

  describe("nextPlayerAfter", () => {
    test("return next player", () => {
      const game = new Game({ id: "game" });
      const firstPlayer = game.addPlayer();
      const secondPlayer = game.addPlayer();

      expect(game.nextPlayerAfter(firstPlayer)).toBe(secondPlayer);
    });

    test("return first player if current player is the last of the list", () => {
      const game = new Game({ id: "game" });
      const firstPlayer = game.addPlayer();
      const secondPlayer = game.addPlayer();

      expect(game.nextPlayerAfter(secondPlayer)).toBe(firstPlayer);
    });
  });

  describe("currentPlayer", () => {
    test("return the player that is playing", () => {
      const game = new Game({ id: "game" });
      const playerA = game.addPlayer();
      const playerB = game.addPlayer();
      game.start();

      const playingPlayer = playerA.isPlaying() ? playerA : playerB;

      expect(game.currentPlayer()).toBe(playingPlayer);
    });
  });

  describe("end", () => {
    test("should have been start to be ended", () => {
      const game = new Game({ id: "game" });

      expect(() => game.end()).toThrow("Game has not started");
    });

    test("change state to ended", () => {
      const game = new Game({ id: "game", state: "started" });

      game.end();

      expect(game.toDto().state).toBe("ended");
    });
  });

  describe("canAddPlayer", () => {
    test("return true if state is created", () => {
      const game = new Game({ id: "game", state: "created" });

      expect(game.canAddPlayer()).toBeTruthy();
    });

    test("return false if state is started", () => {
      const game = new Game({ id: "game", state: "started" });

      expect(game.canAddPlayer()).toBeFalsy();
    });

    test("return false if state is ended", () => {
      const game = new Game({ id: "game", state: "ended" });

      expect(game.canAddPlayer()).toBeFalsy();
    });

    test("return false if already full", () => {
      const game = new Game({ id: "game", state: "created" });

      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();
      game.addPlayer();

      expect(game.canAddPlayer()).toBeFalsy();
    });
  });

  describe("isStarted", () => {
    test("return true if state is started", () => {
      const game = new Game({ id: "game", state: "started" });

      expect(() => game.isStarted()).toBeTruthy();
    });
  });

  describe("isEnded", () => {
    test("return true if state is ended", () => {
      const game = new Game({ id: "game", state: "ended" });

      expect(() => game.isEnded()).toBeTruthy();
    });
  });

  describe("winner", () => {
    test("throw if game has not ended", () => {
      const game = new Game({ id: "game", state: "created" });

      expect(() => game.winner()).toThrow("Game has not ended");
    });

    test("return undefined when no player has won", () => {
      const game = new Game({ id: "game", state: "created" });
      const player = game.addPlayer();
      game.addPlayer();
      game.start();

      game.removePlayer(player.id);

      expect(game.winner()).toBeUndefined();
    });
  });

  describe("playerPassed", () => {
    test("end game as stalemate when all players pass consecutively", () => {
      const game = new Game({ id: "game" });
      game.addPlayer();
      game.addPlayer();
      game.start();

      game.playerPassed();
      expect(game.isStarted()).toBe(true);

      game.playerPassed();
      expect(game.isEnded()).toBe(true);
    });

    test("pick lowest hand-value player as winner on stalemate", () => {
      const game = new Game({ id: "game" });
      const playerA = game.addPlayer();
      const playerB = game.addPlayer();
      game.start();

      game.playerPassed();
      game.playerPassed();

      expect(game.isEnded()).toBe(true);
      const winner = game.winner();
      expect(winner).toBeDefined();
      expect(winner!.handValue()).toBeLessThanOrEqual(playerA.handValue());
      expect(winner!.handValue()).toBeLessThanOrEqual(playerB.handValue());
    });

    test("reset consecutive passes when a player draws", () => {
      const game = new Game({ id: "game" });
      game.addPlayer();
      game.addPlayer();
      game.start();

      game.playerPassed();
      expect(game.isStarted()).toBe(true);

      game.currentPlayer().drawCard();
      expect(game.isStarted()).toBe(true);

      game.playerPassed();
      expect(game.isStarted()).toBe(true);
    });
  });

  describe("endReason", () => {
    test("forfeit end reason when player leaves", () => {
      const game = new Game({ id: "game", state: "created" });
      const player = game.addPlayer();
      game.addPlayer();
      game.start();

      game.removePlayer(player.id);

      expect(game.toInfosDto().endReason).toBe("forfeit");
    });

    test("stalemate end reason when all pass", () => {
      const game = new Game({ id: "game" });
      game.addPlayer();
      game.addPlayer();
      game.start();

      game.playerPassed();
      game.playerPassed();

      expect(game.toInfosDto().endReason).toBe("stalemate");
    });
  });

  describe("toInfosDto", () => {
    test("return undefined winnerUsername when game ends by forfeit", () => {
      const game = new Game({ id: "game", state: "created" });
      const player = game.addPlayer();
      game.addPlayer();
      game.start();

      game.removePlayer(player.id);

      expect(game.toInfosDto().winnerUsername).toBeUndefined();
      expect(game.toInfosDto().state).toBe("ended");
    });
  });

  describe("toDto", () => {
    test("return corresponding dto", () => {
      const game = new Game({ id: "game" });

      const dto = game.toDto();
      expect(dto.id).toBe("game");
      expect(dto.players).toStrictEqual([]);
      expect(dto.state).toBe("created");
      expect(dto.isFull).toBe(false);
      expect(dto.gameBoard.tiles).toStrictEqual([]);
      expect(dto.gameBoard.isValid).toBe(true);
      expect(dto.gameBoard.hasModifications).toBe(false);
      expect(dto.gameBoard.points).toBe(0);
      expect(dto.gameBoard.turnPoints).toBe(0);
    });
  });
});

const drawStackMockedToGiveWinningStartupCards = vi
  .spyOn(DrawStack.prototype, "drawStartupCards")
  .mockImplementation(() => [
    { color: "blue", number: 11, duplicata: 1 },
    { color: "blue", number: 12, duplicata: 1 },
    { color: "blue", number: 13, duplicata: 1 },
  ]);

test("A game can be played", () => {
  const gameBoard = new GameBoard({});
  const drawStack = new DrawStack({});
  const game = new Game({
    id: "game",
    gameBoard,
    drawStack,
  });
  expect(game.toDto().state).toBe("created");

  const playerA = game.addPlayer();
  const playerB = game.addPlayer();

  game.start();
  expect(game.toDto().state).toBe("started");

  expect(playerA.isPlaying() || playerB.isPlaying()).toBeTruthy();

  const firstPlayer = playerA.isPlaying() ? playerA : playerB;

  firstPlayer.placeCard(0, { x: 0, y: 0 });
  firstPlayer.placeCard(0, { x: 1, y: 0 });
  firstPlayer.placeCard(0, { x: 2, y: 0 });

  firstPlayer.endTurn();

  expect(firstPlayer.hasWon()).toBe(true);
  expect(game.winner()!.id).toBe(firstPlayer.id);
  expect(game.isEnded()).toBeTruthy();
});

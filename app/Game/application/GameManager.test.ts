import { Game } from "@/app/Game/application/Game";
import { GameManager } from "@/app/Game/application/GameManager";
import { InMemoryGameRepository } from "@/app/Game/application/GameRepository/InMemoryGameRepository";
import { Player } from "@/app/Player/application/Player";
import { afterEach, describe, expect, test, vi } from "vitest";

describe("GameManager", () => {
  describe("connect", () => {
    test("add player to connections", () => {
      // Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });

      // Act
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(
        gameManager.isConnected({
          gameId: "1",
          username: "Alice",
        }),
      ).toBeTruthy();
    });

    test("create game and player and return them", () => {
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });

      const { game, player } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      expect(game).toBeInstanceOf(Game);
      expect(player).toBeInstanceOf(Player);
    });

    test("can't connect if username already connected", () => {
      //Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Act & assert
      expect(() => {
        gameManager.connect({
          gameId: "1",
          username: "Alice",
        });
      }).toThrow(Error);
    });

    test("can connect again if disconected after game start", () => {
      // Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      const { game } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });
      game.start();
      gameManager.disconnect({
        gameId: "1",
        username: "Alice",
      });

      // Act
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(
        gameManager.isConnected({
          gameId: "1",
          username: "Alice",
        }),
      ).toBeTruthy();
    });
  });

  describe("disconnect", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("remove player from connections", () => {
      // Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Act
      gameManager.disconnect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(
        gameManager.isConnected({
          gameId: "1",
          username: "Alice",
        }),
      ).toBeFalsy();
    });

    test("remove player if game is not started", () => {
      // Arrange
      const game = new Game({
        id: "1",
      });
      const spy = vi.spyOn(game, "removePlayer");
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository({
          games: [game],
        }),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Act
      gameManager.disconnect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(spy).toHaveBeenCalledOnce();
    });

    test("destory game if it was the last player connected", () => {
      // Arrange
      const gameRepository = new InMemoryGameRepository();
      const spy = vi.spyOn(gameRepository, "destroy");

      const gameManager = new GameManager({
        gameRepository,
      });
      const { game, player } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      // Act
      gameManager.disconnect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe("leave", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("remove player from game and connections", () => {
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });

      gameManager.leave({
        gameId: "1",
        username: "Alice",
      });

      expect(
        gameManager.isConnected({
          gameId: "1",
          username: "Alice",
        }),
      ).toBeFalsy();
    });

    test("return the game object", () => {
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      const game = gameManager.leave({
        gameId: "1",
        username: "Alice",
      });

      expect(game).toBeInstanceOf(Game);
    });

    test("destroy game if last player leaves", () => {
      const gameRepository = new InMemoryGameRepository();
      const spy = vi.spyOn(gameRepository, "destroy");
      const gameManager = new GameManager({
        gameRepository,
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });

      gameManager.leave({
        gameId: "1",
        username: "Alice",
      });

      expect(spy).toHaveBeenCalledOnce();
    });

    test("end game if player leaves during started game", () => {
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      const { game } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });
      game.start();

      gameManager.leave({
        gameId: "1",
        username: "Alice",
      });

      expect(game.isEnded()).toBeTruthy();
    });

    test("disconnect is safe to call after leave", () => {
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });

      gameManager.leave({
        gameId: "1",
        username: "Alice",
      });

      expect(() =>
        gameManager.disconnect({
          gameId: "1",
          username: "Alice",
        }),
      ).not.toThrow();
    });
  });

  describe("usernames", () => {
    test("return username of all players in game", () => {
      // Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      const { game } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });

      // Assert
      expect(gameManager.usernames(game.id)).toStrictEqual({
        Alice: true,
        Bob: true,
      });
    });

    test("disconnected players are marked false", () => {
      // Arrange
      const gameManager = new GameManager({
        gameRepository: new InMemoryGameRepository(),
      });
      const { game } = gameManager.connect({
        gameId: "1",
        username: "Alice",
      });
      gameManager.connect({
        gameId: "1",
        username: "Bob",
      });
      game.start();
      gameManager.disconnect({
        gameId: "1",
        username: "Alice",
      });

      // Assert
      expect(gameManager.usernames(game.id)).toStrictEqual({
        Alice: false,
        Bob: true,
      });
    });
  });
});

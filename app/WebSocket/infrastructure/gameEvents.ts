import type { GameId, IGame } from "@/app/Game/application/Game";
import { type IGameManager } from "@/app/Game/application/GameManager";
import type { IPlayer } from "@/app/Player/application/Player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  OpponentDto,
  WebSocketNamespace,
  WebSocketServerSocket,
} from "@/app/WebSocket/infrastructure/types";

const gameRoom = (game: IGame) => `${game.id}`;
const playerRoom = (game: IGame, player: IPlayer | PlayerDto) =>
  `${game.id}-${player.id}`;

export const registerGameEvents = ({
  io,
  gameManager,
}: {
  io: WebSocketNamespace;
  gameManager: IGameManager;
}) => {
  const turnTimers = new Map<GameId, NodeJS.Timeout>();

  const clearTurnTimer = (gameId: GameId) => {
    const existing = turnTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      turnTimers.delete(gameId);
    }
  };

  const startTurnTimer = (game: IGame) => {
    clearTurnTimer(game.id);

    if (!game.timerSettings.enabled) return;

    const timeout = setTimeout(() => {
      turnTimers.delete(game.id);

      if (!game.isStarted()) return;

      io.to(gameRoom(game)).emit("timer.expired");

      if (!game.timerSettings.strict) return;

      try {
        const current = game.currentPlayer();

        if (current.canCancelTurnModifications()) {
          current.cancelTurnModifications();
        }

        if (current.canDrawCard()) {
          current.drawCard();
          emitGameUpdate(game);
          io.to(gameRoom(game)).emit("player.drawnCard", current.toDto());
        } else {
          current.pass();
          emitGameUpdate(game);
          io.to(gameRoom(game)).emit("player.passed", current.toDto());
        }

        if (game.isStarted()) {
          emitTimerStart(game);
          startTurnTimer(game);
        }
      } catch (e) {
        console.error("Timer expiry error:", e);
      }
    }, game.timerSettings.durationSeconds * 1000);

    turnTimers.set(game.id, timeout);
  };

  const emitTimerStart = (game: IGame) => {
    if (game.timerSettings.enabled && game.isStarted()) {
      io.to(gameRoom(game)).emit(
        "timer.start",
        game.timerSettings.durationSeconds,
      );
    }
  };

  const emitGameUpdate = (game: IGame) => {
    io.to(gameRoom(game)).emit("game.infos.update", game.toInfosDto());

    const gameDto = game.toDto();
    io.to(gameRoom(game)).emit("gameBoard.update", gameDto.gameBoard);

    gameDto.players.forEach((player) => {
      console.log(`emited to ${player.username}`);
      io.to(playerRoom(game, player)).emit("player.self.update", player);

      const opponents: OpponentDto[] = gameDto.players
        .filter((p) => p.id !== player.id)
        .map((p) => ({
          username: p.username,
          cardCount: p.cards.length,
          isPlaying: p.isPlaying,
          hasStarted: p.hasStarted,
        }));
      io.to(playerRoom(game, player)).emit("opponents.update", opponents);
    });
  };

  const emitConnectionsUpdate = (game: IGame) => {
    io.to(gameRoom(game)).emit(
      "connectedUsernames.update",
      gameManager.usernames(game.id),
    );
  };

  const bindEventsToSocket = ({
    socket,
    game,
    player,
  }: {
    socket: WebSocketServerSocket;
    game: IGame;
    player: IPlayer;
  }) => {
    console.log(`game ${game.id}`);

    socket.join(gameRoom(game));
    socket.join(playerRoom(game, player));

    socket.data.player = player;

    console.log(`${game.playerCount} players`);

    emitGameUpdate(game);
    emitConnectionsUpdate(game);

    socket.on("disconnect", () => {
      gameManager.disconnect({
        gameId: game.id,
        username: player.username,
      });

      console.log("A player disconnected");
      console.log(`${game.playerCount} players`);

      if (game.isEnded()) {
        clearTurnTimer(game.id);
      }

      emitGameUpdate(game);
      emitConnectionsUpdate(game);
    });

    socket.on("game.start", () => {
      if (!game.canStart() || !player.admin) {
        return;
      }

      console.log("Start game");

      game.start();
      emitGameUpdate(game);
      emitTimerStart(game);
      startTurnTimer(game);
    });

    socket.on("game.updateSettings", (settings) => {
      if (!player.admin || game.isStarted() || game.isEnded()) {
        return;
      }

      game.setTimerSettings(settings.timerSettings);
      io.to(gameRoom(game)).emit("game.settings.update", {
        timerSettings: game.timerSettings,
      });
      emitGameUpdate(game);
    });

    socket.on("game.leave", () => {
      console.log(`${player.username} left game ${game.id}`);

      gameManager.leave({
        gameId: game.id,
        username: player.username,
      });

      if (game.isEnded()) {
        clearTurnTimer(game.id);
      }

      emitGameUpdate(game);
      emitConnectionsUpdate(game);

      socket.disconnect();
    });

    socket.on("player.cancelTurnModifications", () => {
      if (!player.canCancelTurnModifications()) {
        return;
      }

      player.cancelTurnModifications();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit(
        "player.canceledTurnModifications",
        player.toDto(),
      );
    });

    socket.on("player.undoLastAction", () => {
      if (!player.canUndoLastAction()) {
        return;
      }

      player.undoLastAction();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.undoneAction", player.toDto());
    });

    socket.on("player.drawCard", () => {
      if (!player.canDrawCard()) {
        return;
      }

      player.drawCard();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.drawnCard", player.toDto());

      if (game.isStarted()) {
        emitTimerStart(game);
        startTurnTimer(game);
      } else {
        clearTurnTimer(game.id);
      }
    });

    socket.on("player.endTurn", () => {
      if (!player.canEndTurn()) {
        return;
      }

      player.endTurn();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.played", player.toDto());

      if (game.isStarted()) {
        emitTimerStart(game);
        startTurnTimer(game);
      } else {
        clearTurnTimer(game.id);
      }
    });

    socket.on("player.pass", () => {
      if (!player.canPass()) {
        return;
      }

      player.pass();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.passed", player.toDto());

      if (game.isStarted()) {
        emitTimerStart(game);
        startTurnTimer(game);
      } else {
        clearTurnTimer(game.id);
      }
    });

    socket.on("player.moveCardAlone", (source) => {
      if (!player.canMoveCardAlone()) {
        return;
      }

      const combinationIndex = player.moveCardAlone(source);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.movedCard", player.toDto(), {
        combinationIndex,
        cardIndex: 0,
      });
    });

    socket.on("player.moveCardToCombination", (source, destination) => {
      if (!player.canMoveCardToCombination()) {
        return;
      }

      player.moveCardToCombination(source, destination);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit(
        "player.movedCard",
        player.toDto(),
        destination,
      );
    });

    socket.on("player.returnCardToHand", (source) => {
      if (!player.canReturnCardToHand(source)) {
        emitGameUpdate(game);
        return;
      }

      player.returnCardToHand(source);
      emitGameUpdate(game);
    });

    socket.on("player.placeCardAlone", (cardIndex) => {
      if (!player.canPlaceCardAlone()) {
        return;
      }

      const combinationIndex = player.placeCardAlone(cardIndex);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.movedCard", player.toDto(), {
        combinationIndex,
        cardIndex: 0,
      });
    });

    socket.on("cursor.move", (position) => {
      socket.to(gameRoom(game)).emit("cursor.update", {
        ...position,
        username: player.username,
      });
    });

    socket.on("player.placeCardInCombination", (cardIndex, destination) => {
      if (!player.canPlaceCardInCombination()) {
        return;
      }

      player.placeCardInCombination(cardIndex, destination);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit(
        "player.movedCard",
        player.toDto(),
        destination,
      );
    });
  };

  io.on("connection", (socket) => {
    const gameId = socket.handshake.query.gameId;
    const username = socket.handshake.query.username;

    console.log(`New player (${username}) want to join game ${gameId}`);

    if (typeof gameId !== "string" || typeof username !== "string") {
      socket.disconnect();
      return;
    }

    try {
      const { game, player } = gameManager.connect({
        gameId,
        username,
      });

      console.log(`${username} connected`);

      bindEventsToSocket({ socket, game, player });
    } catch (e) {
      console.error(e);

      socket.disconnect();
      return;
    }
  });
};

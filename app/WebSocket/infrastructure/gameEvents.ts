import { executeAITurn } from "@/app/AI/application/AITurnExecutor";
import type { GameId, IGame } from "@/app/Game/application/Game";
import { RECONNECT_GRACE_SECONDS, type IGameManager } from "@/app/Game/application/GameManager";
import type { IPlayer } from "@/app/Player/application/Player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import {
  REACTION_TYPES,
  type OpponentDto,
  type ReactionType,
  type WebSocketNamespace,
  type WebSocketServerSocket,
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

        handlePostTurnTransition(game);
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
    const gameDto = game.toDto();

    io.to(gameRoom(game)).emit("gameBoard.update", gameDto.gameBoard);

    gameDto.players.forEach((player) => {
      io.to(playerRoom(game, player)).emit("player.self.update", player);

      const opponents: OpponentDto[] = gameDto.players
        .filter((p) => p.id !== player.id)
        .map((p) => ({
          username: p.username,
          cardCount: p.cards.length,
          isPlaying: p.isPlaying,
          hasStarted: p.hasStarted,
          isAI: p.isAI,
          aiDifficulty: p.aiDifficulty,
        }));
      io.to(playerRoom(game, player)).emit("opponents.update", opponents);
    });

    io.to(gameRoom(game)).emit("game.infos.update", game.toInfosDto());
  };

  const emitConnectionsUpdate = (game: IGame) => {
    io.to(gameRoom(game)).emit(
      "connectedUsernames.update",
      gameManager.usernames(game.id),
    );
  };

  const activeAITurns = new Set<GameId>();

  const checkAndRunAITurn = (game: IGame) => {
    if (!game.isStarted()) return;
    if (activeAITurns.has(game.id)) return;

    let currentPlayer: IPlayer;
    try {
      currentPlayer = game.currentPlayer();
    } catch {
      return;
    }

    if (!currentPlayer.isAI) return;

    activeAITurns.add(game.id);

    const boardTiles = game.toDto().gameBoard.tiles;

    executeAITurn(currentPlayer, game, boardTiles, {
      onMoveExecuted: (position) => {
        emitGameUpdate(game);
        const dto = currentPlayer.toDto();
        io.to(gameRoom(game)).emit("player.movedCard", dto, position);
      },
      onDiagnose: () => {
        const gb = game.toDto().gameBoard;
        const invalid = gb.combinations.filter((c) => c.type === "invalid");
        if (invalid.length > 0) {
          console.log(`[AI-DIAG] ${invalid.length} invalid combo(s) on board:`);
          for (const c of invalid) {
            const desc = c.tiles.map((t) => `${t.card.color[0]}${t.card.number}@(${t.x},${t.y})`).join(", ");
            console.log(`[AI-DIAG]   [${desc}]`);
          }
        }
      },
      onTurnComplete: () => {
        activeAITurns.delete(game.id);
        emitGameUpdate(game);

        const dto = currentPlayer.toDto();
        if (dto.hasDrawnThisTurn) {
          io.to(gameRoom(game)).emit("player.drawnCard", dto);
        } else if (game.isEnded()) {
          io.to(gameRoom(game)).emit("player.played", dto);
          clearTurnTimer(game.id);
        } else {
          io.to(gameRoom(game)).emit("player.played", dto);
        }

        if (game.isStarted()) {
          emitTimerStart(game);
          startTurnTimer(game);
          checkAndRunAITurn(game);
        }
      },
    }).catch((e) => {
      console.error("AI turn execution error:", e);
      activeAITurns.delete(game.id);
    });
  };

  const handlePostTurnTransition = (game: IGame) => {
    if (game.isStarted()) {
      emitTimerStart(game);
      startTurnTimer(game);
      checkAndRunAITurn(game);
    } else {
      clearTurnTimer(game.id);
    }
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
    socket.join(gameRoom(game));
    socket.join(playerRoom(game, player));

    socket.data.player = player;

    emitGameUpdate(game);
    emitConnectionsUpdate(game);

    socket.on("disconnect", () => {
      const { gracePeriod } = gameManager.disconnect({
        gameId: game.id,
        username: player.username,
      });

      if (game.isEnded()) {
        clearTurnTimer(game.id);
      }

      if (gracePeriod) {
        io.to(gameRoom(game)).emit("player.reconnecting", player.username, RECONNECT_GRACE_SECONDS);
      }

      emitGameUpdate(game);
      emitConnectionsUpdate(game);
    });

    socket.on("game.start", () => {
      if (!game.canStart() || !player.admin) {
        return;
      }

      game.start();
      emitGameUpdate(game);
      handlePostTurnTransition(game);
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
      handlePostTurnTransition(game);
    });

    socket.on("player.endTurn", () => {
      if (!player.canEndTurn()) {
        return;
      }

      player.endTurn();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.played", player.toDto());
      handlePostTurnTransition(game);
    });

    socket.on("player.pass", () => {
      if (!player.canPass()) {
        return;
      }

      player.pass();
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.passed", player.toDto());
      handlePostTurnTransition(game);
    });

    socket.on("player.placeCard", (cardIndex, position) => {
      if (!player.canPlaceCard()) {
        return;
      }

      const snapped = player.placeCard(cardIndex, position);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.movedCard", player.toDto(), snapped);
    });

    socket.on("player.moveCard", (from, to) => {
      if (!player.canMoveCard()) {
        return;
      }

      const snapped = player.moveCard(from, to);
      emitGameUpdate(game);
      io.to(gameRoom(game)).emit("player.movedCard", player.toDto(), snapped);
    });

    socket.on("player.moveCards", (moves) => {
      if (!player.canMoveCard()) {
        return;
      }
      if (!Array.isArray(moves) || moves.length === 0) return;

      try {
        const snapped = player.moveCards(moves);
        emitGameUpdate(game);
        if (snapped.length > 0) {
          io.to(gameRoom(game)).emit("player.movedCard", player.toDto(), snapped[0]);
        }
      } catch {
        emitGameUpdate(game);
      }
    });

    socket.on("player.returnCard", (position) => {
      if (!player.canReturnCard(position)) {
        emitGameUpdate(game);
        return;
      }

      player.returnCard(position);
      emitGameUpdate(game);
    });

    socket.on("cursor.move", (position) => {
      socket.to(gameRoom(game)).emit("cursor.update", {
        ...position,
        username: player.username,
      });
    });

    socket.on("chat.send", (text) => {
      if (typeof text !== "string" || text.trim().length === 0 || text.length > 500) return;
      io.to(gameRoom(game)).emit("chat.message", {
        username: player.username,
        text: text.trim(),
        timestamp: Date.now(),
      });
    });

    socket.on("reaction.send", (reaction: ReactionType) => {
      if (!REACTION_TYPES.includes(reaction)) return;
      io.to(gameRoom(game)).emit("reaction.received", {
        username: player.username,
        reaction,
        timestamp: Date.now(),
      });
    });

  };

  gameManager.onGraceExpired = (gameId: GameId, username: string) => {
    try {
      const game = gameManager.leave({ gameId, username });

      if (game.isEnded()) {
        clearTurnTimer(gameId);
      }

      emitGameUpdate(game);
      emitConnectionsUpdate(game);
    } catch (e) {
      console.error("Grace expiry error:", e);
    }
  };

  io.on("connection", (socket) => {
    const gameId = socket.handshake.query.gameId;
    const username = socket.handshake.query.username;
    const sessionToken = socket.handshake.query.sessionToken;

    if (typeof gameId !== "string" || typeof username !== "string") {
      socket.disconnect();
      return;
    }

    try {
      const { game, player, sessionToken: token, isReconnect } = gameManager.connect({
        gameId,
        username,
        sessionToken: typeof sessionToken === "string" ? sessionToken : undefined,
      });

      bindEventsToSocket({ socket, game, player });

      socket.emit("session.token", token);

      if (isReconnect) {
        io.to(gameRoom(game)).emit("player.reconnected", username);
      }

      if (!isReconnect && game.isAIGame() && game.canStart()) {
        game.start();
        emitGameUpdate(game);
        handlePostTurnTransition(game);
      }
    } catch (e) {
      console.error(e);

      socket.disconnect();
      return;
    }
  });
};

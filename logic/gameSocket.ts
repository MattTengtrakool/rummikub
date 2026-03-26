import type {
  GameInfosDto,
  TimerSettings,
} from "@/app/Game/application/Game";
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  ChatMessage,
  ClientToServerEvents,
  CursorPosition,
  OpponentDto,
  RemoteCursor,
  ServerToClientEvents,
} from "@/app/WebSocket/infrastructure/types";
import { io, Socket } from "socket.io-client";

export const setupGameSocket = ({
  gameId,
  username,
  onSelfPlayerUpdate,
  onPlayerDrawnCard,
  onPlayerPlayed,
  onPlayerPassed,
  onPlayerCanceledTurnModifications,
  onPlayerUndoneAction,
  onPlayerMovedCard,
  onGameBoardUpdate,
  onGameInfosUpdate,
  onConnectedUsernamesUpdate,
  onOpponentsUpdate,
  onCursorUpdate,
  onTimerStart,
  onTimerExpired,
  onSettingsUpdate,
  onChatMessage,
  onConnect,
  onDisconnect,
}: {
  gameId: string;
  username: string;
  onSelfPlayerUpdate: (player: PlayerDto) => void;
  onPlayerDrawnCard: (player: PlayerDto) => void;
  onPlayerPlayed: (player: PlayerDto) => void;
  onPlayerPassed: (player: PlayerDto) => void;
  onPlayerCanceledTurnModifications: (player: PlayerDto) => void;
  onPlayerUndoneAction: (player: PlayerDto) => void;
  onPlayerMovedCard: (
    player: PlayerDto,
    cardPosition: CardPositionOnBoard,
  ) => void;
  onGameBoardUpdate: (gameBoard: GameBoardDto) => void;
  onGameInfosUpdate: (game: GameInfosDto) => void;
  onConnectedUsernamesUpdate: (
    newConnectedUsernames: Record<string, boolean>,
  ) => void;
  onOpponentsUpdate: (opponents: OpponentDto[]) => void;
  onCursorUpdate: (cursor: RemoteCursor) => void;
  onTimerStart: (durationSeconds: number) => void;
  onTimerExpired: () => void;
  onSettingsUpdate: (settings: { timerSettings: TimerSettings }) => void;
  onChatMessage: (message: ChatMessage) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    "/games",
    {
      query: { gameId, username },
    },
  );

  socket.on("connect", onConnect);

  socket.on("disconnect", onDisconnect);

  socket.on("game.infos.update", (game) => {
    onGameInfosUpdate(game);
  });

  socket.on("player.self.update", (selfPlayer) => {
    onSelfPlayerUpdate(selfPlayer);
  });

  socket.on("player.drawnCard", (player) => {
    onPlayerDrawnCard(player);
  });

  socket.on("player.played", (player) => {
    onPlayerPlayed(player);
  });

  socket.on("player.passed", (player) => {
    onPlayerPassed(player);
  });

  socket.on("player.canceledTurnModifications", (player) => {
    onPlayerCanceledTurnModifications(player);
  });

  socket.on("player.undoneAction", (player) => {
    onPlayerUndoneAction(player);
  });

  socket.on("player.movedCard", (player, cardPosition) => {
    onPlayerMovedCard(player, cardPosition);
  });

  socket.on("gameBoard.update", (gameBoard) => {
    onGameBoardUpdate(gameBoard);
  });

  socket.on("connectedUsernames.update", (usernames) => {
    onConnectedUsernamesUpdate(usernames);
  });

  socket.on("opponents.update", (opponents) => {
    onOpponentsUpdate(opponents);
  });

  socket.on("cursor.update", (cursor) => {
    onCursorUpdate(cursor);
  });

  socket.on("timer.start", (durationSeconds) => {
    onTimerStart(durationSeconds);
  });

  socket.on("timer.expired", () => {
    onTimerExpired();
  });

  socket.on("game.settings.update", (settings) => {
    onSettingsUpdate(settings);
  });

  socket.on("chat.message", (message) => {
    onChatMessage(message);
  });

  socket.on("connect_error", (error) => {
    if (socket.active) {
      // temporary failure, the socket will automatically try to reconnect
    } else {
      // the connection was denied by the server
      // in that case, `socket.connect()` must be manually called in order to reconnect
      console.log(error.message);
    }
  });

  const startGame = () => {
    socket.emit("game.start");
  };

  const leaveGame = () => {
    socket.emit("game.leave");
    socket.disconnect();
  };

  const cancelTurnModifications = () => {
    socket.emit("player.cancelTurnModifications");
  };

  const undoLastAction = () => {
    socket.emit("player.undoLastAction");
  };

  const drawCard = () => {
    socket.emit("player.drawCard");
  };

  const endTurn = () => {
    socket.emit("player.endTurn");
  };

  const pass = () => {
    socket.emit("player.pass");
  };

  const moveCardAlone = (source: CardPositionOnBoard) => {
    socket.emit("player.moveCardAlone", source);
  };

  const moveCardToCombination = (
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard,
  ) => {
    socket.emit("player.moveCardToCombination", source, destination);
  };

  const placeCardAlone = (cardIndex: number) => {
    socket.emit("player.placeCardAlone", cardIndex);
  };

  const placeCardInCombination = (
    cardIndex: number,
    destination: CardPositionOnBoard,
  ) => {
    socket.emit("player.placeCardInCombination", cardIndex, destination);
  };

  const returnCardToHand = (source: CardPositionOnBoard) => {
    socket.emit("player.returnCardToHand", source);
  };

  const moveCursor = (position: CursorPosition) => {
    socket.emit("cursor.move", position);
  };

  const updateSettings = (settings: { timerSettings: TimerSettings }) => {
    socket.emit("game.updateSettings", settings);
  };

  const sendChatMessage = (text: string) => {
    socket.emit("chat.send", text);
  };

  return {
    socket,
    startGame,
    leaveGame,
    cancelTurnModifications,
    undoLastAction,
    drawCard,
    endTurn,
    pass,
    moveCardAlone,
    moveCardToCombination,
    placeCardAlone,
    placeCardInCombination,
    returnCardToHand,
    moveCursor,
    updateSettings,
    sendChatMessage,
  };
};

import type { GameInfosDto } from "@/app/Game/application/Game";
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  ClientToServerEvents,
  OpponentDto,
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
  onPlayerMovedCard,
  onGameBoardUpdate,
  onGameInfosUpdate,
  onConnectedUsernamesUpdate,
  onOpponentsUpdate,
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

  return {
    socket,
    startGame,
    leaveGame,
    cancelTurnModifications,
    drawCard,
    endTurn,
    pass,
    moveCardAlone,
    moveCardToCombination,
    placeCardAlone,
    placeCardInCombination,
    returnCardToHand,
  };
};

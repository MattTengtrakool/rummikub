import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";
import type { GameInfosDto, TimerSettings } from "@/app/Game/application/Game";
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { IPlayer } from "@/app/Player/application/Player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { Server, Socket as ServerSocker, type Namespace } from "socket.io";
import { Socket } from "socket.io-client";

export type OpponentDto = {
  username: string;
  cardCount: number;
  isPlaying: boolean;
  hasStarted: boolean;
};

export type ChatMessage = {
  username: string;
  text: string;
  timestamp: number;
};

export type ReactionType = "thumbs-up" | "clap" | "thinking" | "laugh" | "fire" | "cry";

export type ReactionMessage = {
  username: string;
  reaction: ReactionType;
  timestamp: number;
};

export const REACTION_TYPES: ReactionType[] = ["thumbs-up", "clap", "thinking", "laugh", "fire", "cry"];

export interface ServerToClientEvents {
  "player.self.update": (selfPlayer: PlayerDto) => void;
  "player.drawnCard": (player: PlayerDto) => void;
  "player.played": (player: PlayerDto) => void;
  "player.passed": (player: PlayerDto) => void;
  "player.canceledTurnModifications": (player: PlayerDto) => void;
  "player.undoneAction": (player: PlayerDto) => void;
  "player.movedCard": (
    player: PlayerDto,
    cardPosition: CardPositionOnBoard,
  ) => void;
  "gameBoard.update": (gameBoard: GameBoardDto) => void;
  "game.infos.update": (game: GameInfosDto) => void;
  "connectedUsernames.update": (usernames: Record<string, boolean>) => void;
  "opponents.update": (opponents: OpponentDto[]) => void;
  "cursor.update": (cursor: RemoteCursor) => void;
  "timer.start": (durationSeconds: number) => void;
  "timer.expired": () => void;
  "game.settings.update": (settings: { timerSettings: TimerSettings }) => void;
  "chat.message": (message: ChatMessage) => void;
  "session.token": (token: string) => void;
  "player.reconnecting": (username: string, graceSeconds: number) => void;
  "player.reconnected": (username: string) => void;
  "reaction.received": (message: ReactionMessage) => void;
}

export interface ClientToServerEvents {
  "game.start": () => void;
  "game.leave": () => void;
  "player.drawCard": () => void;
  "player.placeCardAlone": (cardIndex: number) => void;
  "player.placeCardInCombination": (
    cardIndex: number,
    destination: CardPositionOnBoard,
  ) => void;
  "player.moveCardAlone": (source: CardPositionOnBoard) => void;
  "player.moveCardToCombination": (
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard,
  ) => void;
  "player.returnCardToHand": (source: CardPositionOnBoard) => void;
  "player.cancelTurnModifications": () => void;
  "player.undoLastAction": () => void;
  "player.endTurn": () => void;
  "player.pass": () => void;
  "cursor.move": (position: CursorPosition) => void;
  "game.updateSettings": (settings: { timerSettings: TimerSettings }) => void;
  "chat.send": (text: string) => void;
  "reaction.send": (reaction: ReactionType) => void;
}

export type DraggingCardInfo = {
  color: CardColor;
  number: CardNumber;
  sourcePosition?: {
    combinationIndex: number;
    cardIndex: number;
  };
};

export type CursorPosition = {
  x: number;
  y: number;
  draggingCard?: DraggingCardInfo;
};

export type RemoteCursor = CursorPosition & {
  username: string;
};

export interface InterServerEvents {}

export interface SocketData {
  player: IPlayer;
}

export type WebSocketClient = Socket<
  ClientToServerEvents,
  ServerToClientEvents
>;

export type WebSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type WebSocketNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type WebSocketServerSocket = ServerSocker<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

import {
  type AIDifficulty,
  AI_USERNAMES,
} from "@/app/AI/domain/types";
import {
  DrawStack,
  type IDrawStack
} from "@/app/DrawStack/application/DrawStack";
import type { DrawStackDto } from "@/app/DrawStack/domain/dtos/drawStack";
import {
  GameBoard,
  type IGameBoard
} from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import {
  type IPlayer,
  type IPlayerFactory,
  Player
} from "@/app/Player/application/Player";
import { MAX_PLAYERS } from "@/app/Player/domain/constants/player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { indexOfFirstPlayerByDrawedCard } from "@/app/Player/domain/gamerules/firstToPlay";
import { isPlayerCountValid } from "@/app/Player/domain/gamerules/isCountValid";
import { v4 as uuidv4 } from "uuid";

type GenerateUserIdFn = () => string;

export type GameDto = {
  id: GameId;
  drawStack: DrawStackDto;
  gameBoard: GameBoardDto;
  state: GameState;
  players: Array<PlayerDto>;
  isFull: boolean;
};

export type TimerSettings = {
  enabled: boolean;
  durationSeconds: number;
  strict: boolean;
};

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  durationSeconds: 60,
  strict: false,
};

export type GameInfosDto = {
  id: GameId;
  state: GameState;
  isFull: boolean;
  playersCount: number;
  drawStackCount: number;
  currentPlayerUsername?: string;
  winnerUsername?: string;
  endReason?: GameEndReason;
  timerSettings: TimerSettings;
  isAIGame: boolean;
  aiDifficulty?: AIDifficulty;
};

type AddPlayerProps = {
  username?: string;
};

export interface IGame {
  id: GameId;
  timerSettings: TimerSettings;

  addPlayer(props?: AddPlayerProps, PlayerClass?: IPlayerFactory): IPlayer;

  addAIPlayer(difficulty: AIDifficulty): IPlayer;

  findPlayerByUsername(username: string): IPlayer;

  findOrAddPlayer(props?: AddPlayerProps): IPlayer;

  removePlayer(id: string): void;

  get playerCount(): number;

  setTimerSettings(settings: TimerSettings): void;

  start(): void;

  end(reason?: GameEndReason): void;

  nextPlayerAfter(currentPlayer: IPlayer): IPlayer;

  beginTurnOfNextPlayer(): void;

  playerPassed(): void;

  resetConsecutivePasses(): void;

  isFull(): boolean;

  currentPlayer(): IPlayer;

  winner(): IPlayer | undefined;

  canStart(): boolean;

  canAddPlayer(): boolean;

  isStarted(): boolean;

  isEnded(): boolean;

  isAIGame(): boolean;

  toDto(): GameDto;

  toInfosDto(): GameInfosDto;
}

export type GameState = "created" | "started" | "ended";
export type GameEndReason = "win" | "forfeit" | "stalemate";
export type GameId = string;

export type GameProps = {
  id: GameId;
  drawStack?: IDrawStack;
  gameBoard?: IGameBoard;
  state?: GameState;
  generateUserId?: GenerateUserIdFn;
  timerSettings?: TimerSettings;
};

export class Game implements IGame {
  public readonly id: GameId;
  public timerSettings: TimerSettings;

  private readonly usernames = ["Alice", "Bob", "Carol", "Dave"];
  private drawStack: IDrawStack;
  private gameBoard: IGameBoard;
  private players: Array<IPlayer> = [];
  private state: GameState;
  private generateUserId: GenerateUserIdFn;
  private consecutivePasses: number = 0;
  private endReason?: GameEndReason;

  constructor(props: GameProps) {
    this.id = props.id;
    this.drawStack = props.drawStack ?? new DrawStack({});
    this.gameBoard = props.gameBoard ?? new GameBoard({});
    this.state = props.state ?? "created";
    this.generateUserId = props.generateUserId ?? (() => uuidv4());
    this.timerSettings = props.timerSettings ?? { ...DEFAULT_TIMER_SETTINGS };
  }

  isFull(): boolean {
    return this.players.length >= MAX_PLAYERS;
  }

  private firstUnusedUsername(): string | undefined {
    const usedUsernames = this.players.map((player) => player.username);

    return this.usernames.find((username) => !usedUsernames.includes(username));
  }

  addPlayer(props?: AddPlayerProps, PlayerClass?: IPlayerFactory): IPlayer {
    if (this.state !== "created") {
      throw new Error("Game has started");
    }

    if (this.isFull()) {
      throw new Error("Max players limit reached");
    }

    const admin = this.players.length === 0 || !this.players.some(p => p.admin);
    const player = new (PlayerClass ?? Player)({
      game: this,
      drawStack: this.drawStack,
      gameBoard: this.gameBoard,
      id: this.generateUserId(),
      admin,
      username: props?.username ?? this.firstUnusedUsername()
    });

    this.players.push(player);

    return player;
  }

  addAIPlayer(difficulty: AIDifficulty): IPlayer {
    const player = this.addPlayer({
      username: AI_USERNAMES[difficulty],
    }, class AIPlayer extends Player {
      constructor(props: any) {
        super({ ...props, isAI: true, aiDifficulty: difficulty });
      }
    });
    player.admin = false;
    return player;
  }

  removePlayer(id: string): void {
    const playerIndex = this.players.findIndex((player) => player.id === id);

    if (playerIndex === -1) {
      throw new Error("Unknown player id");
    }

    const newPlayers = [...this.players];
    const [removedPlayer] = newPlayers.splice(playerIndex, 1);
    this.players = newPlayers;

    if (removedPlayer.admin && this.players[0]) {
      this.players[0].admin = true;
    }

    if (this.state === "started") {
      this.end("forfeit");
    }
  }

  get playerCount(): number {
    return this.players.length;
  }

  findPlayerByUsername(username?: string): IPlayer {
    if (!username) {
      throw new Error("No username given");
    }

    const playerIndex = this.players.findIndex(
      (player) => player.username === username
    );

    if (playerIndex === -1) {
      throw new Error("Unknown player username");
    }

    return this.players[playerIndex];
  }

  findOrAddPlayer(props?: AddPlayerProps): IPlayer {
    try {
      return this.findPlayerByUsername(props?.username);
    } catch (e) {
      return this.addPlayer(props);
    }
  }

  start() {
    if (this.state !== "created") {
      throw new Error("Game already started");
    }

    if (!isPlayerCountValid(this.players.length)) {
      throw new Error("Invalid number of players");
    }

    this.state = "started";

    this.drawStack.shuffle();

    this.players.forEach((player) => player.drawStartupCards());

    this.determineFirstPlayer().beginTurn();
  }

  private determineFirstPlayer(): IPlayer {
    const cards = this.players.map(() => this.drawStack.drawCard());

    const firstPlayerIndex = indexOfFirstPlayerByDrawedCard(cards);

    cards.forEach((card) => this.drawStack.putBack(card));

    this.drawStack.shuffle();

    return this.players[firstPlayerIndex];
  }

  nextPlayerAfter(currentPlayer: IPlayer): IPlayer {
    const playerIndex = this.players.findIndex(
      (player) => player.id === currentPlayer.id
    );

    if (playerIndex >= this.players.length - 1) {
      return this.players[0];
    }

    if (playerIndex < 0) {
      throw new Error("Index out of range");
    }

    return this.players[playerIndex + 1];
  }

  beginTurnOfNextPlayer() {
    this.nextPlayerAfter(this.currentPlayer()).beginTurn();
  }

  playerPassed(): void {
    this.consecutivePasses++;

    if (this.consecutivePasses >= this.players.length) {
      this.end("stalemate");
    } else {
      this.beginTurnOfNextPlayer();
    }
  }

  resetConsecutivePasses(): void {
    this.consecutivePasses = 0;
  }

  currentPlayer(): IPlayer {
    if (this.state !== "started") {
      throw new Error("Game has not started");
    }

    const player = this.players.find((player) => player.isPlaying());

    if (!player) {
      throw new Error("No current player");
    }

    return player;
  }

  winner(): IPlayer | undefined {
    if (this.state !== "ended") {
      throw new Error("Game has not ended");
    }

    const normalWinner = this.players.find((player) => player.hasWon());
    if (normalWinner) return normalWinner;

    if (this.endReason === "stalemate" && this.players.length > 0) {
      return this.players.reduce((lowest, player) =>
        player.handValue() < lowest.handValue() ? player : lowest,
      );
    }

    return undefined;
  }

  end(reason: GameEndReason = "win"): void {
    if (this.state !== "started") {
      throw new Error("Game has not started");
    }

    this.state = "ended";
    this.endReason = reason;
  }

  setTimerSettings(settings: TimerSettings): void {
    if (this.state !== "created") {
      throw new Error("Cannot change settings after game has started");
    }
    this.timerSettings = { ...settings };
  }

  canStart(): boolean {
    return this.state === "created" && isPlayerCountValid(this.players.length);
  }

  canAddPlayer(): boolean {
    return this.state === "created" && !this.isFull();
  }

  isAIGame(): boolean {
    return this.players.some((player) => player.isAI);
  }

  isStarted(): boolean {
    return this.state === "started";
  }

  isEnded(): boolean {
    return this.state === "ended";
  }

  toDto(): GameDto {
    return {
      id: this.id,
      drawStack: this.drawStack.toDto(),
      gameBoard: this.gameBoard.toDto(),
      players: this.players.map((player) => player.toDto()),
      state: this.state,
      isFull: this.isFull()
    };
  }

  toInfosDto(): GameInfosDto {
    return {
      id: this.id,
      state: this.state,
      isFull: this.isFull(),
      playersCount: this.players.length,
      drawStackCount: this.drawStack.toDto().cardCount,
      currentPlayerUsername:
        this.state === "started" ? this.currentPlayer().username : undefined,
      winnerUsername:
        this.state === "ended" ? this.winner()?.username : undefined,
      endReason: this.endReason,
      timerSettings: this.timerSettings,
      isAIGame: this.isAIGame(),
      aiDifficulty: this.players.find((p) => p.isAI)?.aiDifficulty,
    };
  }
}

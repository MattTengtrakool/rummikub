import type { AIDifficulty } from "@/app/AI/domain/types";
import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CardListDto } from "@/app/Card/domain/dtos/cardList";
import { canStartWithPoints } from "@/app/Combination/domain/gamerules/canStartWith";
import type { IDrawStack } from "@/app/DrawStack/application/DrawStack";
import type { IGame } from "@/app/Game/application/Game";
import type {
  BoardPosition,
  IGameBoard,
} from "@/app/GameBoard/application/GameBoard";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto, PlayerId } from "@/app/Player/domain/dtos/player";
import { handValue as calculateHandValue } from "@/app/Player/domain/gamerules/handValue";
import { isWinnerPlayer } from "@/app/Player/domain/gamerules/hasWon";
import { generate } from "random-words";

type TurnSnapshot = {
  cards: CardListDto;
  tiles: ReadonlyArray<PlacedTileDto>;
};

export interface IPlayer {
  admin: boolean;
  id: PlayerId;
  username: string;
  readonly isAI: boolean;
  readonly aiDifficulty?: AIDifficulty;
  drawStartupCards(): void;
  beginTurn(): void;
  drawCard(): void;
  placeCard(cardIndex: number, position: BoardPosition): BoardPosition;
  moveCard(from: BoardPosition, to: BoardPosition): BoardPosition;
  moveCards(
    moves: ReadonlyArray<{ from: BoardPosition; to: BoardPosition }>,
  ): BoardPosition[];
  returnCard(position: BoardPosition): void;
  canReturnCard(position: BoardPosition): boolean;
  cancelTurnModifications(): void;
  undoLastAction(): void;
  canUndoLastAction(): boolean;
  endTurn(): void;
  pass(): void;
  canDrawCard(): boolean;
  canPass(): boolean;
  canPlaceCard(): boolean;
  canMoveCard(): boolean;
  canCancelTurnModifications(): boolean;
  canEndTurn(): boolean;
  isPlaying(): boolean;
  hasWon(): boolean;
  handValue(): number;
  toDto(): PlayerDto;
}

export interface IPlayerFactory {
  new (props: PlayerProps): IPlayer;
}

export type PlayerProps = {
  gameBoard: IGameBoard;
  drawStack: IDrawStack;
  id: string;
  game?: IGame;
  cards?: CardListDto;
  hasDrawnStartupCards?: boolean;
  hasStarted?: boolean;
  username?: string;
  admin?: boolean;
  isAI?: boolean;
  aiDifficulty?: AIDifficulty;
};

export class Player implements IPlayer {
  private readonly game?: IGame;
  private readonly gameBoard: IGameBoard;
  private readonly drawStack: IDrawStack;

  public readonly id: PlayerId;
  public readonly username: string;
  public readonly isAI: boolean;
  public readonly aiDifficulty?: AIDifficulty;
  public admin: boolean;

  private cards: CardListDto;
  private previousTurnCards: CardListDto = [];

  private hasDrawnStartupCards: boolean;
  private hasStarted: boolean;

  private hasDrawnThisTurn: boolean = false;
  private _isPlaying: boolean = false;
  private turnHistory: TurnSnapshot[] = [];

  constructor(props: PlayerProps) {
    this.game = props.game;
    this.gameBoard = props.gameBoard;
    this.drawStack = props.drawStack;
    this.id = props.id;
    this.cards = props.cards ?? [];
    this.hasDrawnStartupCards = props.hasDrawnStartupCards ?? false;
    this.hasStarted = props.hasStarted ?? false;
    this.username = props.username ?? generate(1)[0];
    this.admin = props.admin ?? false;
    this.isAI = props.isAI ?? false;
    this.aiDifficulty = props.aiDifficulty;

    this.saveTurnCards();
  }

  private saveTurnCards() {
    this.previousTurnCards = Object.freeze([...this.cards]);
  }

  private pushToHistory() {
    this.turnHistory.push({
      cards: Object.freeze([...this.cards]),
      tiles: Object.freeze([...this.gameBoard.toDto().tiles]),
    });
  }

  drawStartupCards(): void {
    if (this.hasDrawnStartupCards) {
      throw new Error("Player has already draw startup cards");
    }

    this.hasDrawnStartupCards = true;
    this.cards = [...this.cards, ...this.drawStack.drawStartupCards()];
  }

  beginTurn(): void {
    this.saveTurnCards();
    this.gameBoard.beginTurn();
    this._isPlaying = true;
    this.hasDrawnThisTurn = false;
    this.turnHistory = [];
  }

  placeCard(cardIndex: number, position: BoardPosition): BoardPosition {
    this.pushToHistory();
    return this.gameBoard.placeCard(this.giveCard(cardIndex), position);
  }

  moveCard(from: BoardPosition, to: BoardPosition): BoardPosition {
    this.pushToHistory();
    return this.gameBoard.moveCard(from, to);
  }

  moveCards(
    moves: ReadonlyArray<{ from: BoardPosition; to: BoardPosition }>,
  ): BoardPosition[] {
    this.pushToHistory();
    return this.gameBoard.moveCards(moves);
  }

  returnCard(position: BoardPosition): void {
    this.pushToHistory();
    const card = this.gameBoard.removeCard(position);
    this.cards = Object.freeze([...this.cards, card]);
  }

  canReturnCard(position: BoardPosition): boolean {
    return (
      this._isPlaying &&
      !this.hasDrawnThisTurn &&
      !this.gameBoard.wasCardOnBoardBeforeTurn(position)
    );
  }

  cancelTurnModifications(): void {
    this.cards = Object.freeze([...this.previousTurnCards]);
    this.saveTurnCards();
    this.gameBoard.cancelTurnModifications();
    this.turnHistory = [];
  }

  undoLastAction(): void {
    const snapshot = this.turnHistory.pop();
    if (!snapshot) return;

    this.cards = Object.freeze([...snapshot.cards]);
    this.gameBoard.restoreFromSnapshot(snapshot.tiles);
  }

  canUndoLastAction(): boolean {
    return (
      this._isPlaying &&
      !this.hasDrawnThisTurn &&
      this.turnHistory.length > 0
    );
  }

  private canStart(): boolean {
    return canStartWithPoints(this.gameBoard.turnPoints());
  }

  drawCard(): void {
    this.cards = [...this.cards, this.drawStack.drawCard()];
    this.hasDrawnThisTurn = true;
    this.endTurn();
  }

  private giveCard(cardIndex: number): CardDto {
    const cards = [...this.cards];
    const [placedCard] = cards.splice(cardIndex, 1);
    this.cards = Object.freeze(cards);
    return placedCard;
  }

  endTurn(): void {
    if (!this.hasDrawnThisTurn) {
      this.throwIfNotEnoughPointsToStart();
      this.throwIfNoPointsPlayed();
    }

    this.gameBoard.endTurn();

    if (!this.hasDrawnThisTurn && !this.hasStarted) {
      this.hasStarted = true;
    }

    if (this.game) {
      this.game.resetConsecutivePasses();

      if (this.hasWon()) {
        this.game.end();
      } else {
        this.game.beginTurnOfNextPlayer();
      }
    }

    this._isPlaying = false;
  }

  pass(): void {
    if (this.game) {
      this.game.playerPassed();
    }
    this._isPlaying = false;
  }

  canDrawCard(): boolean {
    return (
      this._isPlaying &&
      !this.gameBoard.hasModifications() &&
      !this.drawStack.isEmpty()
    );
  }

  canPass(): boolean {
    return (
      this._isPlaying &&
      this.drawStack.isEmpty() &&
      !this.gameBoard.hasModifications()
    );
  }

  canPlaceCard(): boolean {
    return this._isPlaying && !this.hasDrawnThisTurn;
  }

  canMoveCard(): boolean {
    return (
      this._isPlaying && !this.hasDrawnThisTurn && !this.gameBoard.isEmpty()
    );
  }

  canCancelTurnModifications(): boolean {
    return (
      this._isPlaying &&
      !this.hasDrawnThisTurn &&
      this.gameBoard.hasModifications()
    );
  }

  canEndTurn(): boolean {
    return (
      this._isPlaying &&
      this.gameBoard.isValid() &&
      (this.hasStarted || this.canStart()) &&
      this.gameBoard.turnPoints() > 0
    );
  }

  private throwIfNoPointsPlayed() {
    if (this.gameBoard.turnPoints() === 0) {
      throw new Error("No points played");
    }
  }

  private throwIfNotEnoughPointsToStart() {
    if (this.hasStarted || this.canStart()) {
      return;
    }
    throw new Error("Not enough points to start");
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  hasWon(): boolean {
    return isWinnerPlayer({
      hasDrawnStartupCards: this.hasDrawnStartupCards,
      cards: this.cards,
    });
  }

  handValue(): number {
    return calculateHandValue(this.cards);
  }

  canStartGame(): boolean {
    if (!this.game) {
      return false;
    }
    return this.game.canStart() && this.admin;
  }

  toDto(): PlayerDto {
    return {
      id: this.id,
      username: this.username,
      admin: this.admin,
      cards: this.cards,
      isPlaying: this.isPlaying(),
      hasDrawnStartupCards: this.hasDrawnStartupCards,
      hasStarted: this.hasStarted,
      hasDrawnThisTurn: this.hasDrawnThisTurn,
      hasWon: this.hasWon(),
      canStartGame: this.canStartGame(),
      canDrawCard: this.canDrawCard(),
      canPass: this.canPass(),
      canPlaceCard: this.canPlaceCard(),
      canMoveCard: this.canMoveCard(),
      canReturnCard: this._isPlaying && !this.hasDrawnThisTurn,
      canCancelTurnModifications: this.canCancelTurnModifications(),
      canUndoLastAction: this.canUndoLastAction(),
      canEndTurn: this.canEndTurn(),
      handValue: this.handValue(),
      isAI: this.isAI,
      aiDifficulty: this.aiDifficulty,
    };
  }
}

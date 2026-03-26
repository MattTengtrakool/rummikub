import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CardListDto } from "@/app/Card/domain/dtos/cardList";
import { canStartWithPoints } from "@/app/Combination/domain/gamerules/canStartWith";
import type { CombinationDto } from "@/app/Combination/domain/dtos/combination";
import type { IDrawStack } from "@/app/DrawStack/application/DrawStack";
import type { IGame } from "@/app/Game/application/Game";
import type {
  CardPositionOnBoard,
  CombinationPositionOnBoard,
  IGameBoard,
} from "@/app/GameBoard/application/GameBoard";
import type { PlayerDto, PlayerId } from "@/app/Player/domain/dtos/player";
import { handValue as calculateHandValue } from "@/app/Player/domain/gamerules/handValue";
import { isWinnerPlayer } from "@/app/Player/domain/gamerules/hasWon";
import { generate } from "random-words";

type TurnSnapshot = {
  cards: CardListDto;
  combinations: ReadonlyArray<CombinationDto>;
};

export interface IPlayer {
  admin: boolean;
  id: PlayerId;
  username: string;
  drawStartupCards(): void;
  beginTurn(): void;
  drawCard(): void;
  placeCardAlone(cardIndex: number): CombinationPositionOnBoard;
  placeCardInCombination(
    cardIndex: number,
    destination: CardPositionOnBoard,
  ): void;
  moveCardAlone(source: CardPositionOnBoard): CombinationPositionOnBoard;
  moveCardToCombination(
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard,
  ): void;
  returnCardToHand(source: CardPositionOnBoard): void;
  canReturnCardToHand(source: CardPositionOnBoard): boolean;
  cancelTurnModifications(): void;
  undoLastAction(): void;
  canUndoLastAction(): boolean;
  endTurn(): void;
  pass(): void;
  canDrawCard(): boolean;
  canPass(): boolean;
  canPlaceCardAlone(): boolean;
  canPlaceCardInCombination(): boolean;
  canMoveCardAlone(): boolean;
  canMoveCardToCombination(): boolean;
  canCancelTurnModifications(): boolean;
  canInteractWithCombination(combinationIndex: number): boolean;
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
};

export class Player implements IPlayer {
  private readonly game?: IGame;
  private readonly gameBoard: IGameBoard;
  private readonly drawStack: IDrawStack;

  public readonly id: PlayerId;
  public readonly username: string;
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

    this.saveTurnCards();
  }

  private saveTurnCards() {
    this.previousTurnCards = Object.freeze([...this.cards]);
  }

  private pushToHistory() {
    this.turnHistory.push({
      cards: Object.freeze([...this.cards]),
      combinations: Object.freeze([
        ...this.gameBoard.toDto().combinations,
      ]),
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

  placeCardAlone(cardIndex: number): CombinationPositionOnBoard {
    this.pushToHistory();
    return this.gameBoard.placeCardAlone(this.giveCard(cardIndex));
  }

  placeCardInCombination(
    cardIndex: number,
    destination: CardPositionOnBoard,
  ): void {
    this.pushToHistory();
    this.gameBoard.placeCardInCombination(
      this.giveCard(cardIndex),
      destination,
    );
  }

  moveCardAlone(source: CardPositionOnBoard): CombinationPositionOnBoard {
    this.pushToHistory();
    return this.gameBoard.moveCardAlone(source);
  }

  moveCardToCombination(
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard,
  ): void {
    this.pushToHistory();
    this.gameBoard.moveCardToCombination(source, destination);
  }

  returnCardToHand(source: CardPositionOnBoard): void {
    this.pushToHistory();
    const card = this.gameBoard.removeCardFromBoard(source);
    this.cards = Object.freeze([...this.cards, card]);
  }

  canReturnCardToHand(source: CardPositionOnBoard): boolean {
    return (
      this._isPlaying &&
      !this.hasDrawnThisTurn &&
      !this.gameBoard.wasCardOnBoardBeforeTurn(source)
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
    this.gameBoard.restoreFromSnapshot(snapshot.combinations);
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

  canPlaceCardAlone(): boolean {
    return this._isPlaying && !this.hasDrawnThisTurn;
  }

  canPlaceCardInCombination(): boolean {
    return (
      this._isPlaying && !this.hasDrawnThisTurn && !this.gameBoard.isEmpty()
    );
  }

  canMoveCardAlone(): boolean {
    return (
      this._isPlaying && !this.hasDrawnThisTurn && !this.gameBoard.isEmpty()
    );
  }

  canMoveCardToCombination(): boolean {
    return (
      this._isPlaying && !this.hasDrawnThisTurn && !this.gameBoard.isEmpty()
    );
  }

  canInteractWithCombination(combinationIndex: number): boolean {
    if (!this._isPlaying) {
      return false;
    }

    if (this.hasDrawnThisTurn) {
      return false;
    }

    if (this.gameBoard.isEmpty()) {
      return false;
    }

    if (!this.hasStarted) {
      return this.gameBoard.wasCombinationPlacedThisTurn(combinationIndex);
    }

    return true;
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
      canPlaceCardAlone: this.canPlaceCardAlone(),
      canPlaceCardInCombination: this.canPlaceCardInCombination(),
      canMoveCardAlone: this.canMoveCardAlone(),
      canMoveCardToCombination: this.canMoveCardToCombination(),
      canCancelTurnModifications: this.canCancelTurnModifications(),
      canUndoLastAction: this.canUndoLastAction(),
      canEndTurn: this.canEndTurn(),
      canInteractWithCombination: this.gameBoard
        .toDto()
        .combinations.map((_, index) => this.canInteractWithCombination(index)),
      handValue: this.handValue(),
    };
  }
}

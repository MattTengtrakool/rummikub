import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CombinationDto } from "@/app/Combination/domain/dtos/combination";
import { cardCombinationsPoints } from "@/app/Combination/domain/gamerules/points";
import type {
  BoardPosition,
  GameBoardDto,
  PlacedTileDto,
} from "@/app/GameBoard/domain/dtos/gameBoard";
import {
  detectCombinations,
  type DetectedCombination,
} from "@/app/GameBoard/domain/gamerules/detectCombinations";
import {
  hasCollision,
  shiftTilesForInsertion,
  snapPosition,
} from "@/app/GameBoard/domain/gamerules/snapPosition";

export type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";

export interface IGameBoard {
  beginTurn(): void;

  placeCard(card: CardDto, position: BoardPosition): BoardPosition;

  moveCard(from: BoardPosition, to: BoardPosition): BoardPosition;

  removeCard(position: BoardPosition): CardDto;

  wasCardOnBoardBeforeTurn(position: BoardPosition): boolean;

  cancelTurnModifications(): void;

  restoreFromSnapshot(tiles: ReadonlyArray<PlacedTileDto>): void;

  hasModifications(): boolean;

  isEmpty(): boolean;

  isValid(): boolean;

  turnPoints(): number;

  endTurn(): void;

  points(): number;

  toDto(): GameBoardDto;
}

export type GameBoardProps = {
  tiles?: PlacedTileDto[];
};

const POSITION_MATCH_THRESHOLD = 0.3;

function findTileIndex(
  tiles: PlacedTileDto[],
  position: BoardPosition,
): number {
  return tiles.findIndex(
    (t) =>
      Math.abs(t.x - position.x) < POSITION_MATCH_THRESHOLD &&
      Math.abs(t.y - position.y) < POSITION_MATCH_THRESHOLD,
  );
}

function tilesToCombinationDtos(
  combinations: DetectedCombination[],
): CombinationDto[] {
  return combinations.map((c) => ({
    type: c.type,
    cards: c.tiles.map((t) => t.card),
  }));
}

export class GameBoard implements IGameBoard {
  private tiles: PlacedTileDto[];
  private previousTurnTiles: ReadonlyArray<PlacedTileDto> = [];

  constructor(props: GameBoardProps) {
    this.tiles = props.tiles ? [...props.tiles] : [];
    this.saveTurnTiles();
  }

  beginTurn(): void {
    this.saveTurnTiles();
  }

  private saveTurnTiles() {
    this.previousTurnTiles = Object.freeze(
      this.tiles.map((t) => ({ ...t })),
    );
  }

  placeCard(card: CardDto, position: BoardPosition): BoardPosition {
    const snapped = snapPosition(position, this.tiles);

    if (hasCollision(snapped, this.tiles)) {
      shiftTilesForInsertion(snapped, this.tiles);

      if (hasCollision(snapped, this.tiles)) {
        throw new Error("Position is occupied");
      }
    }

    this.tiles.push({ x: snapped.x, y: snapped.y, card });
    return snapped;
  }

  moveCard(from: BoardPosition, to: BoardPosition): BoardPosition {
    const idx = findTileIndex(this.tiles, from);
    if (idx === -1) throw new Error("No tile at source position");

    const card = this.tiles[idx].card;
    this.tiles.splice(idx, 1);

    const snapped = snapPosition(to, this.tiles);

    if (hasCollision(snapped, this.tiles)) {
      shiftTilesForInsertion(snapped, this.tiles);

      if (hasCollision(snapped, this.tiles)) {
        this.tiles.push({ x: from.x, y: from.y, card });
        throw new Error("Destination is occupied");
      }
    }

    this.tiles.push({ x: snapped.x, y: snapped.y, card });
    return snapped;
  }

  removeCard(position: BoardPosition): CardDto {
    const idx = findTileIndex(this.tiles, position);
    if (idx === -1) throw new Error("No tile at position");

    const [removed] = this.tiles.splice(idx, 1);
    return removed.card;
  }

  wasCardOnBoardBeforeTurn(position: BoardPosition): boolean {
    const tileIdx = findTileIndex([...this.tiles], position);
    if (tileIdx === -1) return false;

    const tile = this.tiles[tileIdx];
    return this.previousTurnTiles.some(
      (t) =>
        t.card.number === tile.card.number &&
        t.card.color === tile.card.color &&
        t.card.duplicata === tile.card.duplicata,
    );
  }

  cancelTurnModifications(): void {
    this.throwIfTurnHasNotStarted();
    this.tiles = this.previousTurnTiles.map((t) => ({ ...t }));
    this.saveTurnTiles();
  }

  restoreFromSnapshot(tiles: ReadonlyArray<PlacedTileDto>): void {
    this.tiles = tiles.map((t) => ({ ...t }));
  }

  hasModifications(): boolean {
    return (
      JSON.stringify(this.previousTurnTiles) !==
      JSON.stringify(this.tiles)
    );
  }

  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  isValid(): boolean {
    if (this.tiles.length === 0) return true;
    const combos = detectCombinations(this.tiles);
    return combos.every((c) => c.type !== "invalid");
  }

  turnPoints(): number {
    this.throwIfTurnHasNotStarted();

    const prevCombos = tilesToCombinationDtos(
      detectCombinations(this.previousTurnTiles),
    );
    const previousPoints = cardCombinationsPoints(prevCombos);

    return this.points() - previousPoints;
  }

  endTurn(): void {
    this.throwIfTurnHasNotStarted();
    this.throwIfNotValid();
  }

  private throwIfTurnHasNotStarted() {
    if (!this.previousTurnTiles) {
      throw new Error("Turn has not started");
    }
  }

  private throwIfNotValid() {
    if (!this.isValid()) {
      throw new Error("Game board is not valid");
    }
  }

  points(): number {
    const combos = tilesToCombinationDtos(
      detectCombinations(this.tiles),
    );
    return cardCombinationsPoints(combos);
  }

  toDto(): GameBoardDto {
    const detected = detectCombinations(this.tiles);
    const combinationDtos = tilesToCombinationDtos(detected);

    return {
      tiles: this.tiles.map((t) => ({ ...t })),
      combinations: detected.map((c) => ({
        type: c.type,
        tiles: c.tiles.map((t) => ({ ...t })),
      })),
      isValid: this.isValid(),
      hasModifications: this.hasModifications(),
      points: cardCombinationsPoints(combinationDtos),
      turnPoints: this.turnPoints(),
    };
  }
}

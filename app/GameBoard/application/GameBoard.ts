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

  moveCards(
    moves: ReadonlyArray<{ from: BoardPosition; to: BoardPosition }>,
  ): BoardPosition[];

  removeCard(position: BoardPosition): CardDto;

  wasCardOnBoardBeforeTurn(position: BoardPosition): boolean;

  cancelTurnModifications(): void;

  restoreFromSnapshot(tiles: ReadonlyArray<PlacedTileDto>): void;

  hasModifications(): boolean;

  isEmpty(): boolean;

  isValid(): boolean;

  diagnoseBoardValidity(): void;

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
        console.log(`[BOARD] placeCard FAILED: ${card.color[0]}${card.number} at (${snapped.x},${snapped.y}) still occupied after shift`);
        throw new Error("Position is occupied");
      }
    }

    this.tiles.push({ x: snapped.x, y: snapped.y, card });
    return snapped;
  }

  moveCard(from: BoardPosition, to: BoardPosition): BoardPosition {
    const idx = findTileIndex(this.tiles, from);
    if (idx === -1) {
      const nearby = this.tiles
        .filter((t) => Math.abs(t.x - from.x) < 2 && Math.abs(t.y - from.y) < 2)
        .map((t) => `${t.card.color[0]}${t.card.number}@(${t.x},${t.y})`);
      console.log(`[BOARD] moveCard FAILED: no tile at (${from.x},${from.y}). Nearby: ${nearby.join(", ") || "none"}`);
      throw new Error("No tile at source position");
    }

    const card = this.tiles[idx].card;
    this.tiles.splice(idx, 1);

    const snapped = snapPosition(to, this.tiles);

    if (hasCollision(snapped, this.tiles)) {
      shiftTilesForInsertion(snapped, this.tiles);

      if (hasCollision(snapped, this.tiles)) {
        console.log(`[BOARD] moveCard FAILED: ${card.color[0]}${card.number} (${from.x},${from.y})→(${snapped.x},${snapped.y}) dest still occupied`);
        this.tiles.push({ x: from.x, y: from.y, card });
        throw new Error("Destination is occupied");
      }
    }

    this.tiles.push({ x: snapped.x, y: snapped.y, card });
    return snapped;
  }

  moveCards(
    moves: ReadonlyArray<{ from: BoardPosition; to: BoardPosition }>,
  ): BoardPosition[] {
    if (moves.length === 0) return [];

    const removed: Array<{ card: CardDto; from: BoardPosition }> = [];
    for (const move of moves) {
      const idx = findTileIndex(this.tiles, move.from);
      if (idx === -1) {
        for (const r of removed) {
          this.tiles.push({ x: r.from.x, y: r.from.y, card: r.card });
        }
        throw new Error("No tile at source position");
      }
      removed.push({ card: this.tiles[idx].card, from: move.from });
      this.tiles.splice(idx, 1);
    }

    const snapped: BoardPosition[] = [];
    for (let i = 0; i < moves.length; i++) {
      const pos = snapPosition(moves[i].to, this.tiles);

      if (hasCollision(pos, this.tiles)) {
        for (let j = i - 1; j >= 0; j--) {
          const placed = this.tiles.pop();
          if (!placed) break;
        }
        for (const r of removed) {
          this.tiles.push({ x: r.from.x, y: r.from.y, card: r.card });
        }
        throw new Error("Destination is occupied");
      }

      this.tiles.push({ x: pos.x, y: pos.y, card: removed[i].card });
      snapped.push(pos);
    }

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

  diagnoseBoardValidity(): void {
    const combos = detectCombinations(this.tiles);
    const invalid = combos.filter((c) => c.type === "invalid");
    if (invalid.length > 0) {
      console.log(`[BOARD] ${invalid.length} invalid combo(s):`);
      for (const c of invalid) {
        const desc = c.tiles.map((t) => `${t.card.color[0]}${t.card.number}@(${t.x},${t.y})`).join(", ");
        console.log(`[BOARD]   invalid: [${desc}]`);
      }
    } else {
      console.log(`[BOARD] all ${combos.length} combos valid`);
    }
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

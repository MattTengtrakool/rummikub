import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIMove } from "@/app/AI/domain/types";
import type { SolverResult } from "@/app/AI/domain/solver/solver";

function cardKey(card: CardDto): string {
  return `${card.color}-${card.number}-${card.duplicata}`;
}

const COLLISION_THRESHOLD = 0.5;
const MAX_ROW_WIDTH = 22;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(...items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function isPositionFree(pos: BoardPosition, tiles: ReadonlyArray<PlacedTileDto>): boolean {
  return !tiles.some(
    (t) =>
      Math.abs(t.x - pos.x) < COLLISION_THRESHOLD &&
      Math.abs(t.y - pos.y) < COLLISION_THRESHOLD,
  );
}

function isRangeFree(
  startX: number,
  y: number,
  length: number,
  tiles: ReadonlyArray<PlacedTileDto>,
): boolean {
  for (let i = 0; i < length; i++) {
    if (!isPositionFree({ x: startX + i, y }, tiles)) return false;
  }
  return true;
}

/**
 * Check that a combo placed at (startX, y) with `length` tiles won't
 * merge with adjacent non-combo tiles (within detection threshold of 1.15).
 */
function wouldMergeAtRange(
  startX: number,
  y: number,
  length: number,
  occupiedTiles: ReadonlyArray<PlacedTileDto>,
): boolean {
  const leftNeighbor = startX - 1;
  const rightNeighbor = startX + length;

  return occupiedTiles.some(
    (t) =>
      Math.abs(t.y - y) < COLLISION_THRESHOLD &&
      (Math.abs(t.x - leftNeighbor) < COLLISION_THRESHOLD ||
        Math.abs(t.x - rightNeighbor) < COLLISION_THRESHOLD),
  );
}

type RowSlot = { row: number; candidates: number[] };

/**
 * Build a list of candidate starting x positions per row.
 * For each row, find gaps and end-of-row positions where a combo of `length` fits
 * without collision or merge.
 */
function findAllViableSlots(
  length: number,
  occupiedTiles: ReadonlyArray<PlacedTileDto>,
): RowSlot[] {
  if (occupiedTiles.length === 0) return [];

  const rowMaxX = new Map<number, number>();
  for (const t of occupiedTiles) {
    const row = Math.round(t.y);
    const cur = rowMaxX.get(row) ?? -Infinity;
    if (t.x > cur) rowMaxX.set(row, t.x);
  }

  const result: RowSlot[] = [];

  for (const [row, maxX] of rowMaxX) {
    const startX = maxX + 2;
    if (startX + length > MAX_ROW_WIDTH) continue;

    if (
      isRangeFree(startX, row, length, occupiedTiles) &&
      !wouldMergeAtRange(startX, row, length, occupiedTiles)
    ) {
      result.push({ row, candidates: [startX] });
    }
  }

  return result;
}

function findSlotForCombo(
  length: number,
  occupiedTiles: ReadonlyArray<PlacedTileDto>,
): { x: number; y: number } {
  const viable = findAllViableSlots(length, occupiedTiles);

  if (viable.length > 0) {
    const chosen = viable.length === 1 ? viable[0] : pick(...viable);
    const x = pick(...chosen.candidates);
    return { x, y: chosen.row };
  }

  let newRow: number;
  if (occupiedTiles.length === 0) {
    newRow = randInt(1, 3);
  } else {
    const maxY = Math.max(...occupiedTiles.map((t) => Math.round(t.y)));
    newRow = maxY + 1;
  }

  return { x: randInt(1, 3), y: newRow };
}

/**
 * Check if a set of board tiles are already in a valid consecutive
 * arrangement (same row, consecutive x positions) so we can keep them
 * in place instead of generating unnecessary moves.
 */
function isAlreadyArranged(tiles: ReadonlyArray<PlacedTileDto>): boolean {
  if (tiles.length < 2) return true;

  const y = Math.round(tiles[0].y);
  for (const t of tiles) {
    if (Math.abs(Math.round(t.y) - y) > 0) return false;
  }

  const xs = tiles.map((t) => Math.round(t.x)).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] !== 1) return false;
  }

  return true;
}

export type ComputeMovesResult = {
  moves: AIMove[];
  resultingBoard: PlacedTileDto[];
};

/**
 * Convert a SolverResult into a sequence of AIMove actions.
 *
 * Computes the complete physical layout holistically:
 * 1. Identifies board tiles that stay vs. tiles being rearranged
 * 2. Board-only combos already in valid positions are kept in place
 * 3. All other combos are laid out in guaranteed-free space
 * 4. Generates moveCard/placeCard moves to reach the target layout
 *
 * Also returns the resulting virtual board state (all tiles with final
 * positions) so callers can run subsequent solve passes against it.
 */
export function computeMoves(
  solverResult: SolverResult,
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
): ComputeMovesResult {
  const movedBoardIndices = new Set<number>();
  for (const combo of solverResult.combinations) {
    for (const idx of combo.boardTileIndices) {
      movedBoardIndices.add(idx);
    }
  }

  const stayingTiles: PlacedTileDto[] = boardTiles
    .filter((_, idx) => !movedBoardIndices.has(idx))
    .map((t) => ({ ...t }));

  // Slot occupancy includes ALL current board tile positions. During
  // execution, moved tiles still physically sit at their old positions
  // until their moveCard runs. By treating those as occupied, every
  // move target is guaranteed to be truly free on the current board,
  // regardless of execution order.
  const slotOccupied: PlacedTileDto[] = boardTiles.map((t) => ({ ...t }));

  // Resulting board tracks only final positions (for iterative passes)
  const resultBoard: PlacedTileDto[] = [...stayingTiles];

  const moves: AIMove[] = [];
  const handCardRemovals: number[] = [];

  // First pass: board-only combos already in valid positions stay in place
  const combosToPlace: typeof solverResult.combinations = [];

  for (const combo of solverResult.combinations) {
    if (combo.handTileIndices.length === 0 && combo.boardTileIndices.length > 0) {
      const tiles = combo.boardTileIndices.map((idx) => boardTiles[idx]);
      if (isAlreadyArranged(tiles)) {
        for (const t of tiles) {
          resultBoard.push({ x: t.x, y: t.y, card: t.card });
        }
        continue;
      }
    }
    combosToPlace.push(combo);
  }

  console.log(`[AI-PLACE] boardTiles=${boardTiles.length}, movedIndices=${movedBoardIndices.size}, staying=${stayingTiles.length}, combosToPlace=${combosToPlace.length}, keptInPlace=${solverResult.combinations.length - combosToPlace.length}`);

  // Second pass: lay out all combos that need new positions
  for (const combo of combosToPlace) {
    const { x: startX, y: row } = findSlotForCombo(
      combo.cards.length,
      slotOccupied,
    );

    const comboDesc = combo.cards.map((c) => `${c.color[0]}${c.number}`).join(",");
    console.log(`[AI-PLACE]   combo [${comboDesc}] len=${combo.cards.length} → slot (${startX},${row}), hand=${combo.handTileIndices.length} board=${combo.boardTileIndices.length}`);

    for (let i = 0; i < combo.cards.length; i++) {
      const card = combo.cards[i];
      const position: BoardPosition = { x: startX + i, y: row };

      const boardIdx = combo.boardTileIndices.find((idx) => {
        const boardTile = boardTiles[idx];
        return boardTile && cardKey(boardTile.card) === cardKey(card);
      });

      if (boardIdx !== undefined) {
        const boardTile = boardTiles[boardIdx];
        if (
          Math.abs(boardTile.x - position.x) > 0.1 ||
          Math.abs(boardTile.y - position.y) > 0.1
        ) {
          console.log(`[AI-PLACE]     moveCard ${cardKey(card)} (${boardTile.x},${boardTile.y})→(${position.x},${position.y})`);
          moves.push({
            type: "moveCard",
            from: { x: boardTile.x, y: boardTile.y },
            to: position,
          });
        } else {
          console.log(`[AI-PLACE]     keep ${cardKey(card)} at (${position.x},${position.y})`);
        }
      } else {
        const handIdx = combo.handTileIndices.find((idx) => {
          const handCard = handCards[idx];
          return (
            handCard &&
            cardKey(handCard) === cardKey(card) &&
            !handCardRemovals.includes(idx)
          );
        });

        if (handIdx !== undefined) {
          const adjustedIndex =
            handIdx - handCardRemovals.filter((r) => r < handIdx).length;
          console.log(`[AI-PLACE]     placeCard ${cardKey(card)} handIdx=${handIdx}(adj=${adjustedIndex})→(${position.x},${position.y})`);
          moves.push({ type: "placeCard", cardIndex: adjustedIndex, position });
          handCardRemovals.push(handIdx);
        } else {
          console.log(`[AI-PLACE]     ⚠ NO MATCH for card ${cardKey(card)} in combo! handIndices=${JSON.stringify(combo.handTileIndices)} boardIndices=${JSON.stringify(combo.boardTileIndices)}`);
        }
      }

      slotOccupied.push({ x: position.x, y: position.y, card });
      resultBoard.push({ x: position.x, y: position.y, card });
    }
  }

  console.log(`[AI-PLACE] total moves: ${moves.filter(m => m.type === "moveCard").length} moveCard + ${moves.filter(m => m.type === "placeCard").length} placeCard`);
  return { moves, resultingBoard: resultBoard };
}

/**
 * Simplified move computation for extending existing board combinations.
 * Places hand tiles adjacent to existing combinations on the board.
 */
export function computeExtensionMoves(
  handIndicesToPlace: number[],
  handCards: ReadonlyArray<CardDto>,
  targetPositions: BoardPosition[],
): AIMove[] {
  const moves: AIMove[] = [];
  const removals: number[] = [];

  for (let i = 0; i < handIndicesToPlace.length; i++) {
    const originalIdx = handIndicesToPlace[i];
    const adjustedIdx = originalIdx - removals.filter((r) => r < originalIdx).length;
    moves.push({
      type: "placeCard",
      cardIndex: adjustedIdx,
      position: targetPositions[i],
    });
    removals.push(originalIdx);
  }

  return moves;
}

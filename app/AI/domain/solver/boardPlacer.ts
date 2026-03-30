import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIMove } from "@/app/AI/domain/types";
import type { SolverResult } from "@/app/AI/domain/solver/solver";
import { detectCombinations } from "@/app/GameBoard/domain/gamerules/detectCombinations";

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
 * Scan every position in every occupied row (plus empty rows between
 * them) for slots where a combo of `length` tiles fits without
 * collision or merge. This finds gaps left by extracted tiles, space
 * at the start of rows, and space at the end — not just after the
 * rightmost tile.
 */
function findAllViableSlots(
  length: number,
  occupiedTiles: ReadonlyArray<PlacedTileDto>,
): RowSlot[] {
  if (occupiedTiles.length === 0) return [];

  const rows = new Set<number>();
  for (const t of occupiedTiles) {
    rows.add(Math.round(t.y));
  }

  const sortedRows = [...rows].sort((a, b) => a - b);
  const minRow = sortedRows[0];
  const maxRow = sortedRows[sortedRows.length - 1];

  // Also consider empty rows between occupied rows
  for (let r = minRow; r <= maxRow; r++) {
    rows.add(r);
  }

  const result: RowSlot[] = [];

  for (const row of rows) {
    const candidates: number[] = [];
    for (let startX = 0; startX <= MAX_ROW_WIDTH - length; startX++) {
      if (
        isRangeFree(startX, row, length, occupiedTiles) &&
        !wouldMergeAtRange(startX, row, length, occupiedTiles)
      ) {
        candidates.push(startX);
      }
    }
    if (candidates.length > 0) {
      result.push({ row, candidates });
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

/**
 * Try to keep a combo's existing board tiles at their current positions
 * and only add hand tiles at the edges (left/right extension).
 *
 * Returns the anchor position if extension-in-place is viable, or null
 * to fall back to full relayout.
 */
function tryExtendInPlace(
  combo: SolverResult["combinations"][0],
  boardTiles: ReadonlyArray<PlacedTileDto>,
  slotOccupied: ReadonlyArray<PlacedTileDto>,
): { startX: number; row: number } | null {
  if (combo.boardTileIndices.length === 0) return null;

  const comboBoard = combo.boardTileIndices.map((idx) => boardTiles[idx]);
  if (!isAlreadyArranged(comboBoard)) return null;

  const usedBoard = new Set<number>();
  const cardSources: ("board" | "hand")[] = [];

  for (const card of combo.cards) {
    const key = cardKey(card);
    const bIdx = combo.boardTileIndices.find(
      (idx) => !usedBoard.has(idx) && cardKey(boardTiles[idx].card) === key,
    );
    if (bIdx !== undefined) {
      cardSources.push("board");
      usedBoard.add(bIdx);
    } else {
      cardSources.push("hand");
    }
  }

  // Board tiles must be contiguous in the combo (no hand tiles between them)
  const firstBoard = cardSources.indexOf("board");
  const lastBoard = cardSources.lastIndexOf("board");
  for (let i = firstBoard; i <= lastBoard; i++) {
    if (cardSources[i] === "hand") return null;
  }

  const sorted = [...comboBoard].sort((a, b) => a.x - b.x);
  const row = Math.round(sorted[0].y);
  const existMinX = Math.round(sorted[0].x);
  const startX = existMinX - firstBoard;

  if (startX < 0 || startX + combo.cards.length > MAX_ROW_WIDTH) return null;

  // Exclude the combo's own board tiles from collision/merge checks
  const otherOccupied = slotOccupied.filter(
    (t) =>
      !comboBoard.some(
        (bt) => Math.abs(bt.x - t.x) < 0.1 && Math.abs(bt.y - t.y) < 0.1,
      ),
  );

  for (let i = 0; i < combo.cards.length; i++) {
    if (cardSources[i] === "hand") {
      if (!isPositionFree({ x: startX + i, y: row }, otherOccupied)) return null;
    }
  }

  if (wouldMergeAtRange(startX, row, combo.cards.length, otherOccupied)) return null;

  return { startX, row };
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

  // Only staying tiles occupy slots initially. Tiles being rearranged
  // free their positions so new combos can reuse them instead of always
  // expanding downward. Kept-in-place combos are added below.
  const slotOccupied: PlacedTileDto[] = [...stayingTiles];

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
          slotOccupied.push({ x: t.x, y: t.y, card: t.card });
        }
        continue;
      }
    }
    combosToPlace.push(combo);
  }

  console.log(`[AI-PLACE] boardTiles=${boardTiles.length}, movedIndices=${movedBoardIndices.size}, staying=${stayingTiles.length}, combosToPlace=${combosToPlace.length}, keptInPlace=${solverResult.combinations.length - combosToPlace.length}`);

  // Second pass: lay out all combos that need new positions
  for (const combo of combosToPlace) {
    const inPlace = tryExtendInPlace(combo, boardTiles, slotOccupied);
    const slot = inPlace
      ? { x: inPlace.startX, y: inPlace.row }
      : findSlotForCombo(combo.cards.length, slotOccupied);
    const { x: startX, y: row } = slot;

    const comboDesc = combo.cards.map((c) => `${c.color[0]}${c.number}`).join(",");
    console.log(`[AI-PLACE]   combo [${comboDesc}] len=${combo.cards.length} → ${inPlace ? "extend-in-place" : "new-slot"} (${startX},${row}), hand=${combo.handTileIndices.length} board=${combo.boardTileIndices.length}`);

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

  const postCombos = detectCombinations(resultBoard);
  const invalid = postCombos.filter((c) => c.type === "invalid");
  if (invalid.length > 0) {
    const desc = invalid.map((c) =>
      c.tiles.map((t) => `${t.card.color[0]}${t.card.number}@(${t.x},${t.y})`).join(","),
    ).join(" | ");
    console.log(`[AI-PLACE] WARNING: resultingBoard has ${invalid.length} invalid combo(s): ${desc}`);
    console.log(`[AI-PLACE] → returning empty moves to prevent invalid execution`);
    return { moves: [], resultingBoard: boardTiles.map((t) => ({ ...t })) };
  }

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

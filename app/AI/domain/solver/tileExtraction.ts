import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIMove } from "@/app/AI/domain/types";
import {
  detectCombinations,
  type DetectedCombination,
} from "@/app/GameBoard/domain/gamerules/detectCombinations";
import { isValidCardSuite } from "@/app/Combination/domain/gamerules/isValidCardSuite";
import { isValidCardSerie } from "@/app/Combination/domain/gamerules/isValidCardSerie";
import { solve, type SolverResult, type SolverCombination } from "./solver";
import { computeMoves } from "./boardPlacer";
import { findExtensions } from "@/app/AI/application/strategies/extensions";

const EMPTY_RESULT: SolverResult = {
  combinations: [],
  handTilesUsed: 0,
  pointsAdded: 0,
};

type ExtractableInfo = {
  card: CardDto;
  boardIndex: number;
  comboIndex: number;
};

function boardTileIndex(
  boardTiles: ReadonlyArray<PlacedTileDto>,
  tile: PlacedTileDto,
): number {
  return boardTiles.findIndex(
    (bt) => Math.abs(bt.x - tile.x) < 0.1 && Math.abs(bt.y - tile.y) < 0.1,
  );
}

/**
 * Identify tiles that can be safely removed from existing board combos.
 *
 * - Suite of length L > 3: first and last tiles (removing from ends keeps
 *   the remaining tiles consecutive)
 * - Serie of length 4: any single tile (3 remaining is still valid)
 */
function findExtractableTiles(
  boardTiles: ReadonlyArray<PlacedTileDto>,
  combos: DetectedCombination[],
): ExtractableInfo[] {
  const extractable: ExtractableInfo[] = [];

  for (let ci = 0; ci < combos.length; ci++) {
    const combo = combos[ci];
    if (combo.type === "invalid") continue;
    if (combo.tiles.length <= 3) continue;

    const sorted = [...combo.tiles].sort((a, b) => a.x - b.x);

    if (combo.type === "suite") {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstIdx = boardTileIndex(boardTiles, first);
      const lastIdx = boardTileIndex(boardTiles, last);

      if (firstIdx !== -1) {
        extractable.push({
          card: first.card,
          boardIndex: firstIdx,
          comboIndex: ci,
        });
      }
      if (lastIdx !== -1) {
        extractable.push({
          card: last.card,
          boardIndex: lastIdx,
          comboIndex: ci,
        });
      }
    } else if (combo.type === "serie") {
      for (const tile of sorted) {
        const idx = boardTileIndex(boardTiles, tile);
        if (idx !== -1) {
          extractable.push({
            card: tile.card,
            boardIndex: idx,
            comboIndex: ci,
          });
        }
      }
    }
  }

  return extractable;
}

/**
 * Validate that removing the used board tiles doesn't break any
 * existing combo. Each combo must either be fully consumed or have
 * at least 3 remaining tiles that form a valid suite/serie.
 */
function validateExtractions(
  combos: DetectedCombination[],
  boardTiles: ReadonlyArray<PlacedTileDto>,
  usedBoardIndices: Set<number>,
): boolean {
  const comboRemovals = new Map<number, number>();

  for (const idx of usedBoardIndices) {
    for (let ci = 0; ci < combos.length; ci++) {
      const combo = combos[ci];
      const belongsToCombo = combo.tiles.some(
        (t) => boardTileIndex(boardTiles, t) === idx,
      );
      if (belongsToCombo) {
        comboRemovals.set(ci, (comboRemovals.get(ci) ?? 0) + 1);
        break;
      }
    }
  }

  for (const [ci, removedCount] of comboRemovals) {
    const combo = combos[ci];
    const remaining = combo.tiles.length - removedCount;

    if (remaining === 0) continue;
    if (remaining < 3) return false;

    const remainingTiles = combo.tiles.filter(
      (t) => !usedBoardIndices.has(boardTileIndex(boardTiles, t)),
    );
    const remainingCards = remainingTiles
      .sort((a, b) => a.x - b.x)
      .map((t) => t.card);

    if (!isValidCardSuite(remainingCards) && !isValidCardSerie(remainingCards)) {
      return false;
    }
  }

  return true;
}

/**
 * Single-pass extraction: identify extractable tiles from the board,
 * augment the hand, run the solver, validate, and remap.
 */
export function solveWithExtraction(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
  maxSearchNodes: number,
): SolverResult {
  if (!hasStarted) return EMPTY_RESULT;
  if (boardTiles.length === 0) return EMPTY_RESULT;

  const combos = detectCombinations(boardTiles);
  const extractable = findExtractableTiles(boardTiles, combos);

  if (extractable.length === 0) return EMPTY_RESULT;

  const augmentedHand: CardDto[] = [
    ...handCards,
    ...extractable.map((e) => e.card),
  ];

  const result = solve(augmentedHand, [], {
    hasStarted: true,
    includeBoard: false,
    maxSearchNodes,
  });

  if (result.handTilesUsed === 0) return EMPTY_RESULT;

  const originalHandSize = handCards.length;

  const usedBoardIndices = new Set<number>();
  let usesExtractedTile = false;

  for (const combo of result.combinations) {
    for (const handIdx of combo.handTileIndices) {
      if (handIdx >= originalHandSize) {
        usesExtractedTile = true;
        const info = extractable[handIdx - originalHandSize];
        usedBoardIndices.add(info.boardIndex);
      }
    }
  }

  if (!usesExtractedTile) return EMPTY_RESULT;

  if (!validateExtractions(combos, boardTiles, usedBoardIndices)) {
    return EMPTY_RESULT;
  }

  const remapped: SolverCombination[] = result.combinations.map((combo) => {
    const realHandIndices: number[] = [];
    const boardIndices: number[] = [];

    for (const handIdx of combo.handTileIndices) {
      if (handIdx >= originalHandSize) {
        const info = extractable[handIdx - originalHandSize];
        boardIndices.push(info.boardIndex);
      } else {
        realHandIndices.push(handIdx);
      }
    }

    return {
      cards: combo.cards,
      type: combo.type,
      handTileIndices: realHandIndices,
      boardTileIndices: [...combo.boardTileIndices, ...boardIndices],
    };
  });

  const actualHandTilesUsed = remapped.reduce(
    (sum, c) => sum + c.handTileIndices.length,
    0,
  );

  if (actualHandTilesUsed === 0) return EMPTY_RESULT;

  return {
    combinations: remapped,
    handTilesUsed: actualHandTilesUsed,
    pointsAdded: result.pointsAdded,
  };
}

export type IterativeSolveConfig = {
  extractionBudget: number;
  handOnlyBudget: number;
  maxPasses: number;
};

/**
 * Multi-pass iterative solver.
 *
 * Each pass:
 * 1. Tries tile extraction (smart rearrangement) on current board state
 * 2. Tries hand-only combos
 * 3. Picks whichever places more hand tiles
 * 4. Applies the result virtually (updates hand + board)
 * 5. Repeats — the changed board may unlock new extraction opportunities
 *
 * After all passes, runs extensions on the final board state.
 *
 * This captures chain-extraction patterns like:
 * "extract R6 from [R4,R5,R6] → form [R6,B6,G6] → now [R4,R5] is short,
 *  but [R3,R4,R5] with hand R3 forms a new suite" — found in pass 2.
 */
export function solveIteratively(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
  config: IterativeSolveConfig,
): AIMove[] {
  let currentHand: CardDto[] = [...handCards];
  let currentBoard: PlacedTileDto[] = [...boardTiles];
  let started = hasStarted;
  const allMoves: AIMove[] = [];

  for (let pass = 0; pass < config.maxPasses; pass++) {
    const extraction = started
      ? solveWithExtraction(
          currentHand,
          currentBoard,
          true,
          config.extractionBudget,
        )
      : EMPTY_RESULT;

    const handOnly = solve(currentHand, [], {
      hasStarted: started,
      includeBoard: false,
      maxSearchNodes: config.handOnlyBudget,
    });

    const best =
      extraction.handTilesUsed > handOnly.handTilesUsed ? extraction : handOnly;

    if (best.handTilesUsed === 0) break;

    const { moves, resultingBoard } = computeMoves(
      best,
      currentHand,
      currentBoard,
    );
    if (moves.length === 0) break;

    allMoves.push(...moves);

    const usedHandIndices = new Set<number>();
    for (const combo of best.combinations) {
      for (const idx of combo.handTileIndices) {
        usedHandIndices.add(idx);
      }
    }
    currentHand = currentHand.filter((_, i) => !usedHandIndices.has(i));
    currentBoard = resultingBoard;
    started = true;
  }

  if (started && currentHand.length > 0) {
    const extensions = findExtensions(currentHand, currentBoard);
    allMoves.push(...extensions.moves);
  }

  return allMoves;
}

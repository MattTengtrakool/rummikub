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
import { solveILP } from "./ilpSolver";
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
 * Identify tiles that can be extracted from existing board combos.
 *
 * When dissolveAll is false (standard mode):
 * - 3-tile combos: ALL tiles (dissolution — must use all or none)
 * - 4+ suite: first and last tiles (safe partial extraction)
 * - 4+ serie: any single tile (safe partial extraction)
 *
 * When dissolveAll is true (aggressive mode):
 * - ALL tiles from ALL valid combos are extractable. The solver can use
 *   any subset; validation ensures the remainder is still valid or empty.
 */
function findExtractableTiles(
  boardTiles: ReadonlyArray<PlacedTileDto>,
  combos: DetectedCombination[],
  excludeComboIndices: Set<number> = new Set(),
  dissolveAll: boolean = false,
): ExtractableInfo[] {
  const extractable: ExtractableInfo[] = [];

  for (let ci = 0; ci < combos.length; ci++) {
    const combo = combos[ci];
    if (combo.type === "invalid") continue;
    if (excludeComboIndices.has(ci)) continue;

    const sorted = [...combo.tiles].sort((a, b) => a.x - b.x);

    if (dissolveAll || combo.tiles.length === 3) {
      for (const tile of sorted) {
        const idx = boardTileIndex(boardTiles, tile);
        if (idx !== -1) {
          extractable.push({ card: tile.card, boardIndex: idx, comboIndex: ci });
        }
      }
    } else if (combo.type === "suite") {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstIdx = boardTileIndex(boardTiles, first);
      const lastIdx = boardTileIndex(boardTiles, last);

      if (firstIdx !== -1) {
        extractable.push({ card: first.card, boardIndex: firstIdx, comboIndex: ci });
      }
      if (lastIdx !== -1) {
        extractable.push({ card: last.card, boardIndex: lastIdx, comboIndex: ci });
      }
    } else if (combo.type === "serie") {
      for (const tile of sorted) {
        const idx = boardTileIndex(boardTiles, tile);
        if (idx !== -1) {
          extractable.push({ card: tile.card, boardIndex: idx, comboIndex: ci });
        }
      }
    }
  }

  return extractable;
}

/**
 * Find which board combos would be left in an invalid state by the given
 * set of removed board tile indices.
 */
function findInvalidCombos(
  combos: DetectedCombination[],
  boardTiles: ReadonlyArray<PlacedTileDto>,
  usedBoardIndices: Set<number>,
): Set<number> {
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

  const invalid = new Set<number>();
  for (const [ci, removedCount] of comboRemovals) {
    const combo = combos[ci];
    const remaining = combo.tiles.length - removedCount;

    if (remaining === 0) continue;
    if (remaining < 3) {
      invalid.add(ci);
      continue;
    }

    const remainingTiles = combo.tiles.filter(
      (t) => !usedBoardIndices.has(boardTileIndex(boardTiles, t)),
    );
    const remainingCards = remainingTiles
      .sort((a, b) => a.x - b.x)
      .map((t) => t.card);

    if (!isValidCardSuite(remainingCards) && !isValidCardSerie(remainingCards)) {
      invalid.add(ci);
    }
  }

  return invalid;
}

type ExtractionAttemptResult = {
  result: SolverResult;
  invalidCombos: Set<number>;
};

/**
 * Run solver with augmented hand (real hand + extractable tiles),
 * validate the result, and remap indices.
 *
 * Returns the remapped SolverResult on success (with empty invalidCombos),
 * or EMPTY_RESULT plus the set of problematic combo indices on failure.
 */
function attemptExtraction(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  combos: DetectedCombination[],
  extractable: ExtractableInfo[],
  maxSearchNodes: number,
): ExtractionAttemptResult {
  const fail = (bad: Set<number> = new Set()): ExtractionAttemptResult => ({
    result: EMPTY_RESULT,
    invalidCombos: bad,
  });

  const augmentedHand: CardDto[] = [
    ...handCards,
    ...extractable.map((e) => e.card),
  ];

  const solverResult = solve(augmentedHand, [], {
    hasStarted: true,
    includeBoard: false,
    maxSearchNodes,
  });

  if (solverResult.handTilesUsed === 0) return fail();

  const originalHandSize = handCards.length;
  const usedBoardIndices = new Set<number>();
  let usesExtractedTile = false;

  for (const combo of solverResult.combinations) {
    for (const handIdx of combo.handTileIndices) {
      if (handIdx >= originalHandSize) {
        usesExtractedTile = true;
        const info = extractable[handIdx - originalHandSize];
        usedBoardIndices.add(info.boardIndex);
      }
    }
  }

  if (!usesExtractedTile) return fail();

  const invalidCombos = findInvalidCombos(combos, boardTiles, usedBoardIndices);
  if (invalidCombos.size > 0) return fail(invalidCombos);

  const remapped: SolverCombination[] = solverResult.combinations.map((combo) => {
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

  if (actualHandTilesUsed === 0) return fail();

  return {
    result: {
      combinations: remapped,
      handTilesUsed: actualHandTilesUsed,
      pointsAdded: solverResult.pointsAdded,
    },
    invalidCombos: new Set(),
  };
}

const MAX_EXTRACTION_RETRIES = 3;

/**
 * Multi-attempt extraction with dissolution support.
 *
 * Phase 1: try with 3-tile combo dissolution enabled. If the solver
 * partially dissolves combos (uses some but not all tiles from a 3-tile
 * group), those combos are excluded and the solver retries.
 *
 * Phase 2: try safe-only extraction (4+ combos only) as a baseline,
 * since dissolution retries may have exhausted without finding a valid plan.
 *
 * Returns the best valid result across all attempts.
 */
export function solveWithExtraction(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
  maxSearchNodes: number,
  dissolveAll: boolean = false,
): SolverResult {
  if (!hasStarted) return EMPTY_RESULT;
  if (boardTiles.length === 0) return EMPTY_RESULT;

  const combos = detectCombinations(boardTiles);
  let bestResult = EMPTY_RESULT;

  const excludedCombos = new Set<number>();

  for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
    const extractable = findExtractableTiles(
      boardTiles, combos, excludedCombos, dissolveAll,
    );
    if (extractable.length === 0) break;

    const { result, invalidCombos } = attemptExtraction(
      handCards, boardTiles, combos, extractable, maxSearchNodes,
    );

    if (result.handTilesUsed > 0) {
      if (result.handTilesUsed > bestResult.handTilesUsed) {
        bestResult = result;
      }
      break;
    }

    if (invalidCombos.size === 0) break;
    for (const ci of invalidCombos) excludedCombos.add(ci);
  }

  const safeExclude = new Set<number>();
  for (let ci = 0; ci < combos.length; ci++) {
    if (combos[ci].tiles.length <= 3) safeExclude.add(ci);
  }
  const safeExtractable = findExtractableTiles(boardTiles, combos, safeExclude);
  if (safeExtractable.length > 0) {
    const { result } = attemptExtraction(
      handCards, boardTiles, combos, safeExtractable, maxSearchNodes,
    );
    if (result.handTilesUsed > bestResult.handTilesUsed) {
      bestResult = result;
    }
  }

  return bestResult;
}

/**
 * ILP-based extraction: same logic as attemptExtraction but uses the
 * optimal ILP solver instead of the budget-limited backtracking solver.
 */
async function attemptExtractionILP(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  combos: DetectedCombination[],
  extractable: ExtractableInfo[],
): Promise<ExtractionAttemptResult> {
  const fail = (bad: Set<number> = new Set()): ExtractionAttemptResult => ({
    result: EMPTY_RESULT,
    invalidCombos: bad,
  });

  const augmentedHand: CardDto[] = [
    ...handCards,
    ...extractable.map((e) => e.card),
  ];

  const solverResult = await solveILP(augmentedHand, [], {
    hasStarted: true,
    includeBoard: false,
  });

  if (solverResult.handTilesUsed === 0) return fail();

  const originalHandSize = handCards.length;
  const usedBoardIndices = new Set<number>();
  let usesExtractedTile = false;

  for (const combo of solverResult.combinations) {
    for (const handIdx of combo.handTileIndices) {
      if (handIdx >= originalHandSize) {
        usesExtractedTile = true;
        const info = extractable[handIdx - originalHandSize];
        usedBoardIndices.add(info.boardIndex);
      }
    }
  }

  if (!usesExtractedTile) return fail();

  const invalidCombos = findInvalidCombos(combos, boardTiles, usedBoardIndices);
  if (invalidCombos.size > 0) return fail(invalidCombos);

  const remapped: SolverCombination[] = solverResult.combinations.map((combo) => {
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

  if (actualHandTilesUsed === 0) return fail();

  return {
    result: {
      combinations: remapped,
      handTilesUsed: actualHandTilesUsed,
      pointsAdded: solverResult.pointsAdded,
    },
    invalidCombos: new Set(),
  };
}

/**
 * ILP-based extraction with retry logic.
 * Mirrors solveWithExtraction but uses the optimal ILP solver.
 */
export async function solveWithExtractionILP(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
): Promise<SolverResult> {
  if (boardTiles.length === 0) return EMPTY_RESULT;

  const combos = detectCombinations(boardTiles);
  let bestResult = EMPTY_RESULT;

  const excludedCombos = new Set<number>();

  for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
    const extractable = findExtractableTiles(
      boardTiles, combos, excludedCombos, true,
    );
    if (extractable.length === 0) break;

    const { result, invalidCombos } = await attemptExtractionILP(
      handCards, boardTiles, combos, extractable,
    );

    if (result.handTilesUsed > 0) {
      if (result.handTilesUsed > bestResult.handTilesUsed) {
        bestResult = result;
      }
      break;
    }

    if (invalidCombos.size === 0) break;
    for (const ci of invalidCombos) excludedCombos.add(ci);
  }

  if (bestResult.handTilesUsed === 0) {
    const safeExclude = new Set<number>();
    for (let ci = 0; ci < combos.length; ci++) {
      if (combos[ci].tiles.length <= 3) safeExclude.add(ci);
    }
    const safeExtractable = findExtractableTiles(boardTiles, combos, safeExclude);
    if (safeExtractable.length > 0) {
      const { result } = await attemptExtractionILP(
        handCards, boardTiles, combos, safeExtractable,
      );
      if (result.handTilesUsed > bestResult.handTilesUsed) {
        bestResult = result;
      }
    }
  }

  return bestResult;
}

export type IterativeSolveConfig = {
  extractionBudget: number;
  handOnlyBudget: number;
  maxPasses: number;
  dissolveAll?: boolean;
};

/**
 * Multi-pass iterative solver.
 *
 * Each pass:
 * 1. Tries tile extraction with dissolution (smart rearrangement)
 * 2. Tries hand-only combos
 * 3. Picks whichever places more hand tiles (preferring extraction on ties)
 * 4. Applies the result virtually (updates hand + board)
 * 5. Repeats — the changed board may unlock new extraction opportunities
 *
 * After all passes, runs extensions on the final board state.
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
          config.dissolveAll ?? false,
        )
      : EMPTY_RESULT;

    const handOnly = solve(currentHand, [], {
      hasStarted: started,
      includeBoard: false,
      maxSearchNodes: config.handOnlyBudget,
    });

    const best =
      extraction.handTilesUsed >= handOnly.handTilesUsed
        ? extraction
        : handOnly;

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

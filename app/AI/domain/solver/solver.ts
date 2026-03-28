import type { CardDto } from "@/app/Card/domain/dtos/card";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";
import { isValidCardSuite } from "@/app/Combination/domain/gamerules/isValidCardSuite";
import { isValidCardSerie } from "@/app/Combination/domain/gamerules/isValidCardSerie";
import { cardCombinationPoints } from "@/app/Combination/domain/gamerules/points";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import {
  findAllCandidateCombinations,
  buildTilePool,
  type TileWithOrigin,
  type CandidateCombination,
} from "@/app/AI/domain/solver/combinationFinder";

export type SolverCombination = {
  cards: CardDto[];
  type: "suite" | "serie";
  handTileIndices: number[];
  boardTileIndices: number[];
};

export type SolverResult = {
  combinations: SolverCombination[];
  handTilesUsed: number;
  pointsAdded: number;
};

export type SolverConstraints = {
  hasStarted: boolean;
  includeBoard: boolean;
  maxSearchNodes?: number;
};

const EMPTY_RESULT: SolverResult = {
  combinations: [],
  handTilesUsed: 0,
  pointsAdded: 0,
};

function tileKey(tile: TileWithOrigin): string {
  return `${tile.fromHand ? "h" : "b"}-${tile.originalIndex}`;
}

/**
 * Core backtracking solver for Rummikub.
 *
 * Given hand tiles and optionally board tiles, finds the best set of
 * non-overlapping valid combinations that maximizes hand tiles played.
 *
 * When board tiles are included (hard mode), ALL board tiles must end up
 * in some valid combination in the solution.
 */
export function solve(
  handCards: ReadonlyArray<CardDto>,
  boardCards: ReadonlyArray<CardDto>,
  constraints: SolverConstraints,
): SolverResult {
  const pool = buildTilePool(
    handCards,
    constraints.includeBoard ? boardCards : undefined,
  );

  const candidates = findAllCandidateCombinations(pool);

  if (candidates.length === 0) return EMPTY_RESULT;

  const hasHandTile = (c: CandidateCombination) =>
    c.tiles.some((t) => t.fromHand);

  const relevantCandidates = candidates.filter(hasHandTile);
  if (relevantCandidates.length === 0 && !constraints.includeBoard) {
    return EMPTY_RESULT;
  }

  const allCandidates = constraints.includeBoard ? candidates : relevantCandidates;

  allCandidates.sort((a, b) => {
    const aHand = a.tiles.filter((t) => t.fromHand).length;
    const bHand = b.tiles.filter((t) => t.fromHand).length;
    if (aHand !== bHand) return bHand - aHand;
    return b.tiles.length - a.tiles.length;
  });

  let bestResult = EMPTY_RESULT;
  let nodesExplored = 0;
  const maxNodes = constraints.maxSearchNodes ?? 5000;

  const usedTiles = new Set<string>();
  const currentCombos: CandidateCombination[] = [];

  function canUseTiles(combo: CandidateCombination): boolean {
    const keys = new Set<string>();
    for (const tile of combo.tiles) {
      const k = tileKey(tile);
      if (usedTiles.has(k)) return false;
      if (keys.has(k)) return false;
      keys.add(k);
    }
    return true;
  }

  function markTiles(combo: CandidateCombination): string[] {
    const keys: string[] = [];
    for (const tile of combo.tiles) {
      const k = tileKey(tile);
      usedTiles.add(k);
      keys.push(k);
    }
    return keys;
  }

  function unmarkTiles(keys: string[]) {
    for (const k of keys) {
      usedTiles.delete(k);
    }
  }

  function evaluateCurrent(): SolverResult | null {
    if (constraints.includeBoard) {
      const boardTileCount = boardCards.length;
      let coveredBoardTiles = 0;
      for (const combo of currentCombos) {
        for (const tile of combo.tiles) {
          if (!tile.fromHand) coveredBoardTiles++;
        }
      }
      if (coveredBoardTiles < boardTileCount) return null;
    }

    let handTilesUsed = 0;
    let totalPoints = 0;
    const combinations: SolverCombination[] = [];

    for (const combo of currentCombos) {
      const handIndices: number[] = [];
      const boardIndices: number[] = [];

      for (const tile of combo.tiles) {
        if (tile.fromHand) {
          handTilesUsed++;
          handIndices.push(tile.originalIndex);
        } else {
          boardIndices.push(tile.originalIndex);
        }
      }

      if (handIndices.length > 0) {
        const comboDto = { type: combo.type, cards: combo.tiles.map((t) => t.card) };
        totalPoints += cardCombinationPoints(comboDto);
      }

      combinations.push({
        cards: combo.tiles.map((t) => t.card),
        type: combo.type,
        handTileIndices: handIndices,
        boardTileIndices: boardIndices,
      });
    }

    if (handTilesUsed === 0) return null;

    if (!constraints.hasStarted && totalPoints < MIN_POINTS_TO_START) {
      return null;
    }

    return { combinations, handTilesUsed, pointsAdded: totalPoints };
  }

  function isBetterThan(a: SolverResult, b: SolverResult): boolean {
    if (a.handTilesUsed !== b.handTilesUsed) {
      return a.handTilesUsed > b.handTilesUsed;
    }
    return a.pointsAdded > b.pointsAdded;
  }

  function search(startIndex: number) {
    nodesExplored++;
    if (nodesExplored > maxNodes) return;

    const result = evaluateCurrent();
    if (result && isBetterThan(result, bestResult)) {
      bestResult = result;
    }

    for (let i = startIndex; i < allCandidates.length; i++) {
      const combo = allCandidates[i];
      if (!canUseTiles(combo)) continue;

      const keys = markTiles(combo);
      currentCombos.push(combo);

      search(i + 1);

      currentCombos.pop();
      unmarkTiles(keys);

      if (nodesExplored > maxNodes) return;
    }
  }

  search(0);

  return bestResult;
}

/**
 * Quick solve: find the first valid play (for Easy mode).
 * Tries each candidate individually, then pairs, returning as soon as
 * any valid result is found.
 */
export function solveGreedy(
  handCards: ReadonlyArray<CardDto>,
  constraints: { hasStarted: boolean },
): SolverResult {
  const pool = buildTilePool(handCards);
  const candidates = findAllCandidateCombinations(pool);

  const sortedBySize = [...candidates].sort(
    (a, b) => b.tiles.length - a.tiles.length,
  );

  for (const combo of sortedBySize) {
    const handIndices = combo.tiles
      .filter((t) => t.fromHand)
      .map((t) => t.originalIndex);

    if (handIndices.length === 0) continue;

    const comboDto = {
      type: combo.type,
      cards: combo.tiles.map((t) => t.card),
    };
    const points = cardCombinationPoints(comboDto);

    if (!constraints.hasStarted && points < MIN_POINTS_TO_START) {
      continue;
    }

    return {
      combinations: [{
        cards: combo.tiles.map((t) => t.card),
        type: combo.type,
        handTileIndices: handIndices,
        boardTileIndices: [],
      }],
      handTilesUsed: handIndices.length,
      pointsAdded: points,
    };
  }

  if (!constraints.hasStarted) {
    const usedIndices = new Set<number>();
    const combos: SolverCombination[] = [];
    let totalPoints = 0;
    let totalHandTiles = 0;

    for (const combo of sortedBySize) {
      const handIndices = combo.tiles
        .filter((t) => t.fromHand)
        .map((t) => t.originalIndex);

      if (handIndices.some((i) => usedIndices.has(i))) continue;

      const comboDto = {
        type: combo.type,
        cards: combo.tiles.map((t) => t.card),
      };
      const points = cardCombinationPoints(comboDto);

      handIndices.forEach((i) => usedIndices.add(i));
      combos.push({
        cards: combo.tiles.map((t) => t.card),
        type: combo.type,
        handTileIndices: handIndices,
        boardTileIndices: [],
      });
      totalPoints += points;
      totalHandTiles += handIndices.length;

      if (totalPoints >= MIN_POINTS_TO_START) {
        return {
          combinations: combos,
          handTilesUsed: totalHandTiles,
          pointsAdded: totalPoints,
        };
      }
    }
  }

  return EMPTY_RESULT;
}

import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult } from "@/app/AI/domain/types";
import { solveIteratively } from "@/app/AI/domain/solver/tileExtraction";

/**
 * Medium AI strategy:
 * - Backtracking solver with good budget for optimal hand play
 * - 3-tile combo dissolution: can break apart small groups and reform them
 * - 2-pass iterative solving to find chain-extraction opportunities
 * - Extensions after solving to squeeze out remaining tiles
 */
export function mediumStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  const moves = solveIteratively(handCards, boardTiles, hasStarted, {
    extractionBudget: 50000,
    handOnlyBudget: 25000,
    maxPasses: 4,
  });

  if (moves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves };
}

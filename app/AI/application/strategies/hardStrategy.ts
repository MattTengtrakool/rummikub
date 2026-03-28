import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult } from "@/app/AI/domain/types";
import { solveIteratively } from "@/app/AI/domain/solver/tileExtraction";

/**
 * Hard AI strategy:
 * - Deep backtracking solver with large budget
 * - Aggressive board rearrangement: dissolves ANY combo (not just 3-tile)
 *   and redistributes tiles into better arrangements
 * - 8-pass iterative solving to fully exploit chain-extraction opportunities
 * - Extensions after every pass to squeeze out every remaining tile
 */
export function hardStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  const moves = solveIteratively(handCards, boardTiles, hasStarted, {
    extractionBudget: 200000,
    handOnlyBudget: 100000,
    maxPasses: 10,
    dissolveAll: true,
  });

  if (moves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves };
}

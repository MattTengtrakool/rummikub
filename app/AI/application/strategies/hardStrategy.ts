import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult } from "@/app/AI/domain/types";
import { solveIteratively } from "@/app/AI/domain/solver/tileExtraction";

/**
 * Hard AI strategy:
 * - Optimal hand play via backtracking solver
 * - Smart board rearrangement: extracts tiles from large combos to form new ones
 * - Multi-pass iterative solving (3 passes) to exploit chain-extraction opportunities
 * - Extensions to squeeze out every remaining tile
 * - Feels like an expert who rearranges the board and rarely misses a play
 */
export function hardStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  const moves = solveIteratively(handCards, boardTiles, hasStarted, {
    extractionBudget: 8000,
    handOnlyBudget: 5000,
    maxPasses: 3,
  });

  if (moves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves };
}

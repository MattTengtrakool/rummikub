import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult } from "@/app/AI/domain/types";
import { solveGreedy } from "@/app/AI/domain/solver/solver";
import { computeMoves } from "@/app/AI/domain/solver/boardPlacer";

/**
 * Easy AI strategy:
 * - Uses greedy solver: finds the first/largest valid combo, not the optimal set
 * - Plays one combo at a time (after opening), misses multi-combo turns
 * - Never interacts with the board (no extensions, no extraction)
 * - Feels like a beginner who sees obvious plays but misses opportunities
 */
export function easyStrategy(
  handCards: ReadonlyArray<CardDto>,
  _boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  const result = solveGreedy(handCards, { hasStarted });

  if (result.handTilesUsed === 0) {
    return { action: "draw" };
  }

  const { moves } = computeMoves(result, handCards, _boardTiles);
  if (moves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves };
}

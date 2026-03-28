import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult, AIMove } from "@/app/AI/domain/types";
import { solve } from "@/app/AI/domain/solver/solver";
import { computeMoves } from "@/app/AI/domain/solver/boardPlacer";
import { findExtensions } from "@/app/AI/application/strategies/extensions";

/**
 * Easy AI strategy:
 * - Backtracking solver with modest budget finds good multi-combo turns
 * - Extends existing board combos (adds tiles to ends of suites/series)
 * - No board rearrangement (no extraction or dissolution)
 */
export function easyStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  const result = solve(handCards, [], {
    hasStarted,
    includeBoard: false,
    maxSearchNodes: 10000,
  });

  const allMoves: AIMove[] = [];
  const usedHandIndices = new Set<number>();

  if (result.handTilesUsed > 0) {
    const { moves } = computeMoves(result, handCards, boardTiles);
    allMoves.push(...moves);

    for (const combo of result.combinations) {
      for (const idx of combo.handTileIndices) {
        usedHandIndices.add(idx);
      }
    }
  }

  if (hasStarted) {
    const extensions = findExtensions(handCards, boardTiles, usedHandIndices);
    allMoves.push(...extensions.moves);
  }

  if (allMoves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves: allMoves };
}

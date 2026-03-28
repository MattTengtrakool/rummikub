import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult, AIMove } from "@/app/AI/domain/types";
import { solveILP } from "@/app/AI/domain/solver/ilpSolver";
import { computeMoves } from "@/app/AI/domain/solver/boardPlacer";
import { findExtensions } from "@/app/AI/application/strategies/extensions";
import { solveWithExtraction } from "@/app/AI/domain/solver/tileExtraction";

/**
 * Medium AI strategy:
 * - ILP solver for mathematically optimal hand play
 * - Iterative extraction: borrows tiles from board combos one-by-one
 * - Extensions after solving
 */
export async function mediumStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): Promise<AITurnResult> {
  console.log(`[AI-MED] start: hand=${handCards.length}, board=${boardTiles.length}, hasStarted=${hasStarted}`);
  let currentHand: CardDto[] = [...handCards];
  let currentBoard: PlacedTileDto[] = [...boardTiles];
  let started = hasStarted;
  const allMoves: AIMove[] = [];
  const MAX_PASSES = 4;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const handOnly = await solveILP(currentHand, [], {
      hasStarted: started,
      includeBoard: false,
    });

    const extraction = started
      ? solveWithExtraction(currentHand, currentBoard, true, 50000)
      : handOnly;

    const best =
      extraction.handTilesUsed >= handOnly.handTilesUsed
        ? extraction
        : handOnly;

    console.log(`[AI-MED] pass ${pass}: handOnly=${handOnly.handTilesUsed}, extraction=${extraction.handTilesUsed}, best=${best.handTilesUsed}`);
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

  console.log(`[AI-MED] → ${allMoves.length > 0 ? `playing ${allMoves.length} moves` : "drawing"}`);
  if (allMoves.length === 0) {
    return { action: "draw" };
  }

  return { action: "play", moves: allMoves };
}

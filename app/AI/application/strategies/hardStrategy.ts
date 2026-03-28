import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult, AIMove } from "@/app/AI/domain/types";
import { solveILP } from "@/app/AI/domain/solver/ilpSolver";
import { computeMoves } from "@/app/AI/domain/solver/boardPlacer";
import { findExtensions } from "@/app/AI/application/strategies/extensions";
import { solveWithExtraction } from "@/app/AI/domain/solver/tileExtraction";

/**
 * Hard AI strategy:
 * Phase 1: ILP with full board rearrangement (globally optimal)
 * Phase 2 (fallback): iterative ILP hand-only + extraction from board combos
 * Phase 3: extensions on remaining hand tiles
 */
export async function hardStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): Promise<AITurnResult> {
  console.log(`[AI-HARD] start: hand=${handCards.length}, board=${boardTiles.length}, hasStarted=${hasStarted}`);

  // Phase 1: full board rearrangement
  if (hasStarted && boardTiles.length > 0) {
    console.log(`[AI-HARD] phase 1: ILP full board rearrangement...`);
    const fullResult = await solveILP(
      handCards,
      boardTiles.map((t) => t.card),
      { hasStarted: true, includeBoard: true },
    );
    console.log(`[AI-HARD] phase 1 result: ${fullResult.handTilesUsed} hand tiles, ${fullResult.combinations.length} combos`);

    if (fullResult.handTilesUsed > 0) {
      const { moves, resultingBoard } = computeMoves(fullResult, handCards, boardTiles);
      const usedHandIndices = new Set<number>();
      for (const combo of fullResult.combinations) {
        for (const idx of combo.handTileIndices) usedHandIndices.add(idx);
      }

      const remainingHand = handCards.filter((_, i) => !usedHandIndices.has(i));
      if (remainingHand.length > 0) {
        const ext = findExtensions(remainingHand, resultingBoard);
        if (ext.moves.length > 0) {
          console.log(`[AI-HARD] phase 1 extensions: ${ext.moves.length}`);
          moves.push(...ext.moves);
        }
      }

      console.log(`[AI-HARD] → phase 1 playing ${moves.length} total moves`);
      return { action: "play", moves };
    }
  }

  // Phase 2: iterative ILP hand-only + extraction (fallback)
  console.log(`[AI-HARD] phase 2: iterative ILP + extraction...`);
  let currentHand: CardDto[] = [...handCards];
  let currentBoard: PlacedTileDto[] = [...boardTiles];
  let started = hasStarted;
  const allMoves: AIMove[] = [];
  const MAX_PASSES = 6;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const handOnly = await solveILP(currentHand, [], {
      hasStarted: started,
      includeBoard: false,
    });

    const extraction = started
      ? solveWithExtraction(currentHand, currentBoard, true, 100000, true)
      : handOnly;

    const best =
      extraction.handTilesUsed >= handOnly.handTilesUsed
        ? extraction
        : handOnly;

    console.log(`[AI-HARD] phase 2 pass ${pass}: handOnly=${handOnly.handTilesUsed}, extraction=${extraction.handTilesUsed}, best=${best.handTilesUsed}`);
    if (best.handTilesUsed === 0) break;

    const { moves, resultingBoard } = computeMoves(best, currentHand, currentBoard);
    if (moves.length === 0) break;

    allMoves.push(...moves);

    const usedHandIndices = new Set<number>();
    for (const combo of best.combinations) {
      for (const idx of combo.handTileIndices) usedHandIndices.add(idx);
    }
    currentHand = currentHand.filter((_, i) => !usedHandIndices.has(i));
    currentBoard = resultingBoard;
    started = true;
  }

  // Phase 3: extensions
  if (started && currentHand.length > 0) {
    const extensions = findExtensions(currentHand, currentBoard);
    if (extensions.moves.length > 0) {
      console.log(`[AI-HARD] extensions: ${extensions.moves.length}`);
    }
    allMoves.push(...extensions.moves);
  }

  if (allMoves.length === 0) {
    console.log(`[AI-HARD] → no moves, drawing`);
    return { action: "draw" };
  }

  console.log(`[AI-HARD] → playing ${allMoves.length} total moves`);
  return { action: "play", moves: allMoves };
}

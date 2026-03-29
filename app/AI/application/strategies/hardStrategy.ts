import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AITurnResult, AIMove } from "@/app/AI/domain/types";
import { solveILP } from "@/app/AI/domain/solver/ilpSolver";
import { computeMoves } from "@/app/AI/domain/solver/boardPlacer";
import { findExtensions } from "@/app/AI/application/strategies/extensions";
import { solveWithExtractionILP } from "@/app/AI/domain/solver/tileExtraction";

function countHandTilesInMoves(moves: AIMove[]): number {
  return moves.filter((m) => m.type === "placeCard").length;
}

function runIterativeExtensions(
  hand: ReadonlyArray<CardDto>,
  board: ReadonlyArray<PlacedTileDto>,
  moves: AIMove[],
  maxPasses: number = 5,
): PlacedTileDto[] {
  let extHand = [...hand];
  let extBoard = [...board];
  for (let pass = 0; pass < maxPasses && extHand.length > 0; pass++) {
    const ext = findExtensions(extHand, extBoard);
    if (ext.moves.length === 0) break;
    moves.push(...ext.moves);
    for (const move of ext.moves) {
      if (move.type === "placeCard") {
        const card = extHand.splice(move.cardIndex, 1)[0];
        extBoard = [...extBoard, { x: move.position.x, y: move.position.y, card }];
      }
    }
  }
  return extBoard;
}

/**
 * Hard AI strategy — runs ALL approaches in parallel and picks the best:
 *
 * 1. ILP full board rearrangement (globally optimal when feasible)
 * 2. Iterative ILP hand-only + ILP-based extraction (borrows board tiles)
 *
 * Both paths include iterative extensions. The one that plays more hand
 * tiles wins.
 */
export async function hardStrategy(
  handCards: ReadonlyArray<CardDto>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): Promise<AITurnResult> {
  console.log(`[AI-HARD] start: hand=${handCards.length}, board=${boardTiles.length}, hasStarted=${hasStarted}`);

  type Candidate = { moves: AIMove[]; handTiles: number; label: string; board: PlacedTileDto[] };
  const candidates: Candidate[] = [];

  // ── Approach 1: full board rearrangement ──
  if (hasStarted && boardTiles.length > 0) {
    console.log(`[AI-HARD] approach 1: ILP full board rearrangement...`);
    const fullResult = await solveILP(
      handCards,
      boardTiles.map((t) => t.card),
      { hasStarted: true, includeBoard: true },
    );
    console.log(`[AI-HARD] approach 1 ILP: ${fullResult.handTilesUsed} hand tiles, ${fullResult.combinations.length} combos`);

    if (fullResult.handTilesUsed > 0) {
      const { moves, resultingBoard } = computeMoves(fullResult, handCards, boardTiles);
      const usedHandIndices = new Set<number>();
      for (const combo of fullResult.combinations) {
        for (const idx of combo.handTileIndices) usedHandIndices.add(idx);
      }

      const remainingHand = handCards.filter((_, i) => !usedHandIndices.has(i));
      const finalBoard = runIterativeExtensions(remainingHand, resultingBoard, moves);

      candidates.push({ moves, handTiles: countHandTilesInMoves(moves), label: "full-rearrange", board: finalBoard });
      console.log(`[AI-HARD] approach 1 total: ${countHandTilesInMoves(moves)} hand tiles placed`);
    }
  }

  // ── Approach 2: iterative ILP hand-only + ILP extraction ──
  console.log(`[AI-HARD] approach 2: iterative ILP + ILP extraction...`);
  {
    let currentHand: CardDto[] = [...handCards];
    let currentBoard: PlacedTileDto[] = [...boardTiles];
    let started = hasStarted;
    const moves: AIMove[] = [];
    const MAX_PASSES = 6;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const handOnly = await solveILP(currentHand, [], {
        hasStarted: started,
        includeBoard: false,
      });

      const extraction = started
        ? await solveWithExtractionILP(currentHand, currentBoard)
        : handOnly;

      const best =
        extraction.handTilesUsed >= handOnly.handTilesUsed
          ? extraction
          : handOnly;

      console.log(`[AI-HARD] approach 2 pass ${pass}: handOnly=${handOnly.handTilesUsed}, extraction=${extraction.handTilesUsed}, best=${best.handTilesUsed}`);
      if (best.handTilesUsed === 0) break;

      const { moves: passMoves, resultingBoard } = computeMoves(best, currentHand, currentBoard);
      if (passMoves.length === 0) break;

      moves.push(...passMoves);

      const usedHandIndices = new Set<number>();
      for (const combo of best.combinations) {
        for (const idx of combo.handTileIndices) usedHandIndices.add(idx);
      }
      currentHand = currentHand.filter((_, i) => !usedHandIndices.has(i));
      currentBoard = resultingBoard;
      started = true;
    }

    if (started && currentHand.length > 0) {
      currentBoard = runIterativeExtensions(currentHand, currentBoard, moves);
    }

    if (moves.length > 0) {
      candidates.push({ moves, handTiles: countHandTilesInMoves(moves), label: "iterative+extraction", board: currentBoard });
      console.log(`[AI-HARD] approach 2 total: ${countHandTilesInMoves(moves)} hand tiles placed`);
    }
  }

  // ── Pick the best approach ──
  if (candidates.length === 0) {
    console.log(`[AI-HARD] → no moves from any approach, drawing`);
    return { action: "draw" };
  }

  candidates.sort((a, b) => b.handTiles - a.handTiles);
  const best = candidates[0];
  console.log(`[AI-HARD] → best: ${best.label} with ${best.handTiles} hand tiles, ${best.moves.length} total moves`);
  return { action: "play", moves: best.moves, resultingBoard: best.board };
}

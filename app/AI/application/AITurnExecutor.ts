import type { IPlayer } from "@/app/Player/application/Player";
import type { IGame } from "@/app/Game/application/Game";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIDifficulty, AITurnResult } from "@/app/AI/domain/types";
import { AI_THINKING_DELAY, AI_MOVE_DELAY } from "@/app/AI/domain/types";
import { easyStrategy } from "@/app/AI/application/strategies/easyStrategy";
import { mediumStrategy } from "@/app/AI/application/strategies/mediumStrategy";
import { hardStrategy } from "@/app/AI/application/strategies/hardStrategy";
import { detectCombinations } from "@/app/GameBoard/domain/gamerules/detectCombinations";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function computeAITurn(
  difficulty: AIDifficulty,
  handCards: ReadonlyArray<any>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): Promise<AITurnResult> {
  switch (difficulty) {
    case "easy":
      return easyStrategy(handCards, boardTiles, hasStarted);
    case "medium":
      return await mediumStrategy(handCards, boardTiles, hasStarted);
    case "hard":
      return await hardStrategy(handCards, boardTiles, hasStarted);
  }
}

export type AITurnCallbacks = {
  onMoveExecuted: (position: { x: number; y: number }) => void;
  onTurnComplete: () => void;
  onDiagnose?: () => void;
};

/**
 * Execute an AI player's turn with progressive animation.
 *
 * The target board state is pre-validated, then applied incrementally:
 * board tiles are rearranged one by one, hand tiles placed one by one.
 * Each step directly sets the board state (no collision/snap logic) so
 * physical execution can never fail.
 */
export async function executeAITurn(
  player: IPlayer,
  game: IGame,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  callbacks: AITurnCallbacks,
): Promise<void> {
  if (!player.isAI || !player.aiDifficulty) return;
  if (!player.isPlaying()) return;

  const difficulty = player.aiDifficulty;
  const playerDto = player.toDto();
  const handCards = playerDto.cards;
  const hasStarted = playerDto.hasStarted;

  const thinkingDelay = AI_THINKING_DELAY[difficulty];
  await delay(randomBetween(thinkingDelay.min, thinkingDelay.max));

  if (!game.isStarted() || !player.isPlaying()) return;

  console.log(`[AI-EXEC] computing turn: difficulty=${difficulty}, hand=${handCards.length}, board=${boardTiles.length}, hasStarted=${hasStarted}`);
  const turnResult = await computeAITurn(difficulty, handCards, boardTiles, hasStarted);
  console.log(`[AI-EXEC] turn result: action=${turnResult.action}${turnResult.action === "play" ? `, moves=${turnResult.moves.length}` : ""}`);

  if (turnResult.action === "draw") {
    console.log(`[AI-EXEC] → drawing card`);
    if (player.canDrawCard()) {
      player.drawCard();
      callbacks.onTurnComplete();
    } else if (player.canPass()) {
      player.pass();
      callbacks.onTurnComplete();
    }
    return;
  }

  if (turnResult.action === "pass") {
    console.log(`[AI-EXEC] → passing`);
    if (player.canPass()) {
      player.pass();
    } else if (player.canDrawCard()) {
      player.drawCard();
    }
    callbacks.onTurnComplete();
    return;
  }

  // ── Pre-validate the target board state ──
  const { resultingBoard, moves } = turnResult;
  const combos = detectCombinations(resultingBoard);
  const hasInvalid = combos.some((c) => c.type === "invalid");
  if (hasInvalid) {
    const invalidDesc = combos
      .filter((c) => c.type === "invalid")
      .map((c) => `[${c.tiles.map((t) => `${t.card.color[0]}${t.card.number}@(${t.x},${t.y})`).join(",")}]`)
      .join(", ");
    console.log(`[AI-EXEC] PRE-CHECK FAILED: target board has invalid combos: ${invalidDesc}`);
    console.log(`[AI-EXEC] → skipping plan, drawing instead`);
    if (player.canDrawCard()) {
      player.drawCard();
    } else if (player.canPass()) {
      player.pass();
    }
    callbacks.onTurnComplete();
    return;
  }

  const moveMoves = moves.filter((m) => m.type === "moveCard");
  const placeMoves = moves.filter((m) => m.type === "placeCard");
  console.log(`[AI-EXEC] animating: ${moveMoves.length} moveCard + ${placeMoves.length} placeCard`);

  // ── Phase 1: animate moveCards (board tile rearrangement) ──
  let animBoard = boardTiles.map((t) => ({ ...t }));

  for (const move of moveMoves) {
    if (!game.isStarted() || !player.isPlaying()) return;
    if (move.type !== "moveCard") continue;

    const idx = animBoard.findIndex(
      (t) =>
        Math.abs(t.x - move.from.x) < 0.3 &&
        Math.abs(t.y - move.from.y) < 0.3,
    );
    if (idx !== -1) {
      const tile = animBoard[idx];
      animBoard = animBoard.filter((_, i) => i !== idx);
      animBoard.push({ x: move.to.x, y: move.to.y, card: tile.card });
    }

    player.setBoardState(animBoard);
    callbacks.onMoveExecuted(move.to);
    await delay(AI_MOVE_DELAY);
  }

  // ── Phase 2: animate placeCards (hand tiles appearing one by one) ──
  for (const move of placeMoves) {
    if (!game.isStarted() || !player.isPlaying()) return;
    if (move.type !== "placeCard") continue;

    const card = player.toDto().cards[move.cardIndex];
    if (!card) continue;

    player.removeHandCard(move.cardIndex);
    animBoard.push({ x: move.position.x, y: move.position.y, card });
    player.setBoardState(animBoard);
    callbacks.onMoveExecuted(move.position);
    await delay(AI_MOVE_DELAY);
  }

  // ── Final: ensure board is exactly the target state ──
  player.setBoardState(resultingBoard);

  if (!game.isStarted() || !player.isPlaying()) return;

  // ── End the turn ──
  const canEnd = player.canEndTurn();
  console.log(`[AI-EXEC] canEndTurn=${canEnd}`);
  try {
    if (canEnd) {
      player.endTurn();
      console.log(`[AI-EXEC] ✓ turn ended successfully`);
      callbacks.onTurnComplete();
    } else {
      console.log(`[AI-EXEC] ✗ canEndTurn=false despite pre-validated plan`);
      callbacks.onDiagnose?.();
      player.cancelTurnModifications();
      if (player.canDrawCard()) {
        player.drawCard();
      } else if (player.canPass()) {
        player.pass();
      }
      callbacks.onTurnComplete();
    }
  } catch (e) {
    console.error("[AI-EXEC] end turn threw:", e);
    try {
      player.cancelTurnModifications();
      if (player.canDrawCard()) {
        player.drawCard();
      } else if (player.canPass()) {
        player.pass();
      }
      callbacks.onTurnComplete();
    } catch (fallbackError) {
      console.error("[AI-EXEC] fallback failed:", fallbackError);
    }
  }
}

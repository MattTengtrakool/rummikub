import type { IPlayer } from "@/app/Player/application/Player";
import type { IGame } from "@/app/Game/application/Game";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { AIDifficulty, AITurnResult, AIMove } from "@/app/AI/domain/types";
import { AI_THINKING_DELAY, AI_MOVE_DELAY } from "@/app/AI/domain/types";
import { easyStrategy } from "@/app/AI/application/strategies/easyStrategy";
import { mediumStrategy } from "@/app/AI/application/strategies/mediumStrategy";
import { hardStrategy } from "@/app/AI/application/strategies/hardStrategy";

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
 * Execute an AI player's turn with animated delays between moves.
 *
 * This function is async: it waits between moves so the human player
 * can see tiles being placed one by one.
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

  const moveMoves = turnResult.moves.filter((m) => m.type === "moveCard");
  const placeMoves = turnResult.moves.filter((m) => m.type === "placeCard");
  console.log(`[AI-EXEC] executing: ${moveMoves.length} moveCard + ${placeMoves.length} placeCard`);

  let remaining = [...moveMoves];
  const MAX_RETRIES = 3;
  let totalMoveOk = 0;
  let totalMoveFail = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES && remaining.length > 0; attempt++) {
    const failed: typeof remaining = [];
    for (const move of remaining) {
      if (!game.isStarted() || !player.isPlaying()) return;
      try {
        if (move.type === "moveCard" && player.canMoveCard()) {
          const snapped = player.moveCard(move.from, move.to);
          totalMoveOk++;
          callbacks.onMoveExecuted(snapped);
          await delay(AI_MOVE_DELAY);
        }
      } catch (e) {
        console.log(`[AI-EXEC]   moveCard FAILED (attempt ${attempt}): (${move.from.x},${move.from.y})→(${move.to.x},${move.to.y}): ${e}`);
        totalMoveFail++;
        failed.push(move);
      }
    }
    if (failed.length === remaining.length) {
      console.log(`[AI-EXEC]   moveCard retry stuck, ${failed.length} permanently failed`);
      break;
    }
    remaining = failed;
  }
  console.log(`[AI-EXEC] moveCard done: ${totalMoveOk} ok, ${totalMoveFail} failed`);

  let placeOk = 0;
  let placeFail = 0;
  for (const move of placeMoves) {
    if (!game.isStarted() || !player.isPlaying()) return;
    try {
      if (move.type === "placeCard" && player.canPlaceCard()) {
        const snapped = player.placeCard(move.cardIndex, move.position);
        placeOk++;
        callbacks.onMoveExecuted(snapped);
        await delay(AI_MOVE_DELAY);
      }
    } catch (e) {
      console.log(`[AI-EXEC]   placeCard FAILED: idx=${move.cardIndex} → (${move.position.x},${move.position.y}): ${e}`);
      placeFail++;
      continue;
    }
  }
  console.log(`[AI-EXEC] placeCard done: ${placeOk} ok, ${placeFail} failed`);

  if (!game.isStarted() || !player.isPlaying()) return;

  const canEnd = player.canEndTurn();
  console.log(`[AI-EXEC] canEndTurn=${canEnd}`);
  if (!canEnd) {
    const dto = player.toDto();
    console.log(`[AI-EXEC] canEndTurn detail: isPlaying=${dto.isPlaying}, hasStarted=${dto.hasStarted}`);
    callbacks.onDiagnose?.();
  }
  try {
    if (canEnd) {
      player.endTurn();
      console.log(`[AI-EXEC] ✓ turn ended successfully`);
      callbacks.onTurnComplete();
    } else {
      console.log(`[AI-EXEC] ✗ cannot end turn → cancelling + draw`);
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

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

function computeAITurn(
  difficulty: AIDifficulty,
  handCards: ReadonlyArray<any>,
  boardTiles: ReadonlyArray<PlacedTileDto>,
  hasStarted: boolean,
): AITurnResult {
  switch (difficulty) {
    case "easy":
      return easyStrategy(handCards, boardTiles, hasStarted);
    case "medium":
      return mediumStrategy(handCards, boardTiles, hasStarted);
    case "hard":
      return hardStrategy(handCards, boardTiles, hasStarted);
  }
}

export type AITurnCallbacks = {
  onMoveExecuted: (position: { x: number; y: number }) => void;
  onTurnComplete: () => void;
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

  const turnResult = computeAITurn(difficulty, handCards, boardTiles, hasStarted);

  if (turnResult.action === "draw") {
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
    if (player.canPass()) {
      player.pass();
    } else if (player.canDrawCard()) {
      player.drawCard();
    }
    callbacks.onTurnComplete();
    return;
  }

  for (const move of turnResult.moves) {
    if (!game.isStarted() || !player.isPlaying()) return;

    try {
      if (move.type === "placeCard" && player.canPlaceCard()) {
        const snapped = player.placeCard(move.cardIndex, move.position);
        callbacks.onMoveExecuted(snapped);
        await delay(AI_MOVE_DELAY);
      } else if (move.type === "moveCard" && player.canMoveCard()) {
        const snapped = player.moveCard(move.from, move.to);
        callbacks.onMoveExecuted(snapped);
        await delay(AI_MOVE_DELAY);
      }
    } catch {
      continue;
    }
  }

  if (!game.isStarted() || !player.isPlaying()) return;

  try {
    if (player.canEndTurn()) {
      player.endTurn();
      callbacks.onTurnComplete();
    } else {
      player.cancelTurnModifications();
      if (player.canDrawCard()) {
        player.drawCard();
      } else if (player.canPass()) {
        player.pass();
      }
      callbacks.onTurnComplete();
    }
  } catch (e) {
    console.error("AI end turn failed:", e);
    try {
      player.cancelTurnModifications();
      if (player.canDrawCard()) {
        player.drawCard();
      } else if (player.canPass()) {
        player.pass();
      }
      callbacks.onTurnComplete();
    } catch (fallbackError) {
      console.error("AI fallback failed:", fallbackError);
    }
  }
}

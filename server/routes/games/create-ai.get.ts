import { app } from "@/app/app";
import type { AIDifficulty } from "@/app/AI/domain/types";
import { MAX_PLAYERS } from "@/app/Player/domain/constants/player";

const VALID_DIFFICULTIES: AIDifficulty[] = ["easy", "medium", "hard"];
const MAX_AI_OPPONENTS = MAX_PLAYERS - 1;

export default defineEventHandler((event) => {
  const query = getQuery(event);

  const difficulty = (query.difficulty as string) || "medium";
  if (!VALID_DIFFICULTIES.includes(difficulty as AIDifficulty)) {
    throw createError({ statusCode: 400, message: "Invalid difficulty" });
  }

  const requestedCount = parseInt(query.aiCount as string);
  const aiCount = Number.isFinite(requestedCount)
    ? Math.min(Math.max(requestedCount, 1), MAX_AI_OPPONENTS)
    : 1;

  const game = app.gameRepository.create();

  game.markAsSoloAIGame();
  for (let i = 0; i < aiCount; i++) {
    game.addAIPlayer(difficulty as AIDifficulty);
  }

  if (query.timerEnabled === "true") {
    const durationSeconds = parseInt(query.timerDuration as string) || 60;
    const strict = query.timerStrict === "true";
    game.setTimerSettings({
      enabled: true,
      durationSeconds: Math.min(Math.max(durationSeconds, 15), 300),
      strict,
    });
  }

  return sendRedirect(event, `/games/${game.id}`);
});

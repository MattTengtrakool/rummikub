import { app } from "@/app/app";
import type { AIDifficulty } from "@/app/AI/domain/types";

const VALID_DIFFICULTIES: AIDifficulty[] = ["easy", "medium", "hard"];

export default defineEventHandler((event) => {
  const query = getQuery(event);

  const difficulty = (query.difficulty as string) || "medium";
  if (!VALID_DIFFICULTIES.includes(difficulty as AIDifficulty)) {
    throw createError({ statusCode: 400, message: "Invalid difficulty" });
  }

  const game = app.gameRepository.create();

  game.addAIPlayer(difficulty as AIDifficulty);

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

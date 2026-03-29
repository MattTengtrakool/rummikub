import { app } from "@/app/app";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const value = Number(body?.totalGamesPlayed);

  if (!Number.isInteger(value) || value < 0) {
    throw createError({ statusCode: 400, message: "Invalid value" });
  }

  app.setGamesPlayed(value);

  return { totalGamesPlayed: app.totalGamesPlayed };
});

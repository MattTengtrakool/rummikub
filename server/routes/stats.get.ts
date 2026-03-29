import { app } from "@/app/app";

export default defineEventHandler(() => {
  return {
    totalGamesPlayed: app.totalGamesPlayed,
  };
});

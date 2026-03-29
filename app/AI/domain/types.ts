import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

export type AIDifficulty = "easy" | "medium" | "hard";

export type AIMove =
  | { type: "placeCard"; cardIndex: number; position: BoardPosition }
  | { type: "moveCard"; from: BoardPosition; to: BoardPosition };

export type AITurnResult =
  | { action: "play"; moves: AIMove[]; resultingBoard: PlacedTileDto[] }
  | { action: "draw" }
  | { action: "pass" };

export const AI_USERNAMES: Record<AIDifficulty, string> = {
  easy: "AI",
  medium: "AI",
  hard: "AI",
};

export const AI_THINKING_DELAY: Record<AIDifficulty, { min: number; max: number }> = {
  easy: { min: 1000, max: 2000 },
  medium: { min: 2000, max: 3500 },
  hard: { min: 3000, max: 5000 },
};

export const AI_MOVE_DELAY = 500;

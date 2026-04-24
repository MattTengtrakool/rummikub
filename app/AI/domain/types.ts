import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

export type AIDifficulty = "easy" | "medium" | "hard";

export type AIMove =
  | { type: "placeCard"; cardIndex: number; position: BoardPosition }
  | { type: "moveCard"; from: BoardPosition; to: BoardPosition };

export type AITurnResult =
  | { action: "play"; moves: AIMove[]; resultingBoard: PlacedTileDto[] }
  | { action: "draw" }
  | { action: "pass" };

export const AI_BOT_SUFFIX = "(bot)";

export const AI_BOT_NAMES = [
  "Meld Gibson",
  "Tile Murray",
  "Rack Obama",
  "Tilor Swift",
  "Meldy Cyrus",
  "Bot Marley",
  "Sir Melds-a-Lot",
  "Shuffleupagus",
  "R2-Tile2",
  "Meldonna",
  "The Tilefather",
  "Rack-n-Roll",
  "ChatGP-Tile",
  "Keanu Tiles",
  "Meldroid",
  "Jokerface",
];

export const formatAIUsername = (name: string): string =>
  `${name} ${AI_BOT_SUFFIX}`;

export const AI_THINKING_DELAY: Record<AIDifficulty, { min: number; max: number }> = {
  easy: { min: 1000, max: 2000 },
  medium: { min: 2000, max: 3500 },
  hard: { min: 3000, max: 5000 },
};

export const AI_MOVE_DELAY = 500;

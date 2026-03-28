import type { AIDifficulty } from "@/app/AI/domain/types";
import type { CardListDto } from "@/app/Card/domain/dtos/cardList";

export type PlayerId = string;

export type PlayerDto = {
  id: PlayerId;
  username: string;
  admin: boolean;
  cards: CardListDto;
  isPlaying: boolean;
  hasDrawnStartupCards: boolean;
  hasStarted: boolean;
  hasDrawnThisTurn: boolean;
  hasWon: boolean;
  canStartGame: boolean;
  canDrawCard: boolean;
  canPass: boolean;
  canPlaceCard: boolean;
  canMoveCard: boolean;
  canReturnCard: boolean;
  canCancelTurnModifications: boolean;
  canUndoLastAction: boolean;
  canEndTurn: boolean;
  handValue: number;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
};

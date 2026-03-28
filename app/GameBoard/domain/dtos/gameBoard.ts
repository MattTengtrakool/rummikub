import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CombinationType } from "@/app/Combination/domain/dtos/combination";

export type BoardPosition = { x: number; y: number };

export type PlacedTileDto = {
  x: number;
  y: number;
  card: CardDto;
};

export type DetectedCombinationDto = {
  type: CombinationType;
  tiles: PlacedTileDto[];
};

export type GameBoardDto = {
  tiles: PlacedTileDto[];
  combinations: DetectedCombinationDto[];
  isValid: boolean;
  hasModifications: boolean;
  points: number;
  turnPoints: number;
};

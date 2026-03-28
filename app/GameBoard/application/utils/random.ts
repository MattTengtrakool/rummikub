import { randomCombination } from "@/app/Combination/application/utils/random";
import { GameBoard } from "@/app/GameBoard/application/GameBoard";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

export const randomGameBoard = () => {
  const NB_COMBI = 20;
  const tiles: PlacedTileDto[] = [];

  let currentY = 0;

  for (let i = 0; i < NB_COMBI; i++) {
    const combo = randomCombination();
    const cards = combo.toDto().cards;

    for (let j = 0; j < cards.length; j++) {
      tiles.push({ x: j, y: currentY, card: cards[j] });
    }

    currentY += 2;
  }

  return new GameBoard({ tiles });
};

import type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";

export type CardDraggingHandler = {
  placeCard(cardIndex: number, position: BoardPosition): void;
  moveCard(from: BoardPosition, to: BoardPosition): void;
  returnCard(position: BoardPosition): void;
};

export const makeCardDraggingHandler = ({
  placeCard,
  moveCard,
  returnCard,
  onCardPlaced,
}: {
  placeCard(cardIndex: number, position: BoardPosition): void;
  moveCard(from: BoardPosition, to: BoardPosition): void;
  returnCard(position: BoardPosition): void;
  onCardPlaced?: () => void;
}): CardDraggingHandler => {
  return {
    placeCard(cardIndex: number, position: BoardPosition) {
      onCardPlaced?.();
      placeCard(cardIndex, position);
    },
    moveCard(from: BoardPosition, to: BoardPosition) {
      onCardPlaced?.();
      moveCard(from, to);
    },
    returnCard(position: BoardPosition) {
      returnCard(position);
    },
  };
};

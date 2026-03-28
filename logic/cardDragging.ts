import type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";

export type CardDraggingHandler = {
  placeCard(cardIndex: number, position: BoardPosition): void;
  moveCard(from: BoardPosition, to: BoardPosition): void;
  moveCards(
    moves: Array<{ from: BoardPosition; to: BoardPosition }>,
  ): void;
  returnCard(position: BoardPosition): void;
};

export const makeCardDraggingHandler = ({
  placeCard,
  moveCard,
  moveCards,
  returnCard,
  onCardPlaced,
}: {
  placeCard(cardIndex: number, position: BoardPosition): void;
  moveCard(from: BoardPosition, to: BoardPosition): void;
  moveCards(
    moves: Array<{ from: BoardPosition; to: BoardPosition }>,
  ): void;
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
    moveCards(
      moves: Array<{ from: BoardPosition; to: BoardPosition }>,
    ) {
      onCardPlaced?.();
      moveCards(moves);
    },
    returnCard(position: BoardPosition) {
      returnCard(position);
    },
  };
};

import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";

type Position = number | null;
type CardPosition = {
  combination: Position;
  card: Position;
};

const HAND_SENTINEL = -1;

export const makeCardDraggingHandler = ({
  placeCardInCombination,
  placeCardAlone,
  moveCardAlone,
  moveCardToCombination,
  returnCardToHand,
}: {
  placeCardAlone(cardIndex: number): void;
  placeCardInCombination(
    cardIndex: number,
    destination: CardPositionOnBoard
  ): void;
  moveCardAlone(source: CardPositionOnBoard): void;
  moveCardToCombination(
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard
  ): void;
  returnCardToHand(source: CardPositionOnBoard): void;
}) => {
  const source: CardPosition = {
    card: null,
    combination: null,
  };

  const destination: CardPosition = {
    card: null,
    combination: null,
  };

  const from = (card: Position, combination: Position) => {
    source.card = card;
    source.combination = combination;

    end();
  };

  const to = (card: Position, combination: Position) => {
    destination.card = card;
    destination.combination = combination;
  };

  const toHand = () => {
    destination.card = HAND_SENTINEL;
    destination.combination = HAND_SENTINEL;
  };

  const end = () => {
    if (
      source.card !== null &&
      source.combination === null &&
      destination.card === null &&
      destination.combination === null
    ) {
      return placeCardAlone(source.card);
    }

    if (
      source.card !== null &&
      source.combination === null &&
      destination.card !== null &&
      destination.combination !== null
    ) {
      return placeCardInCombination(source.card, {
        cardIndex: destination.card,
        combinationIndex: destination.combination,
      });
    }

    if (
      source.card !== null &&
      source.combination !== null &&
      destination.card === HAND_SENTINEL &&
      destination.combination === HAND_SENTINEL
    ) {
      return returnCardToHand({
        cardIndex: source.card,
        combinationIndex: source.combination,
      });
    }

    if (
      source.card !== null &&
      source.combination !== null &&
      destination.card === null &&
      destination.combination === null
    ) {
      return moveCardAlone({
        cardIndex: source.card,
        combinationIndex: source.combination,
      });
    }

    if (
      source.card !== null &&
      source.combination !== null &&
      destination.card !== null &&
      destination.combination !== null
    ) {
      return moveCardToCombination(
        {
          cardIndex: source.card,
          combinationIndex: source.combination,
        },
        {
          cardIndex: destination.card,
          combinationIndex: destination.combination,
        }
      );
    }
  };

  return {
    from,
    to,
    toHand,
  };
};
export type CardDraggingHandler = ReturnType<typeof makeCardDraggingHandler>;

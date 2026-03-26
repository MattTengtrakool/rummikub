import type { CardDto } from "@/app/Card/domain/dtos/card";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";
import type { CombinationDto } from "@/app/Combination/domain/dtos/combination";

const resolveJokerValue = (
  cards: ReadonlyArray<CardDto>,
  jokerIndex: number,
  type: CombinationDto["type"],
): number => {
  const nonJokerCards = cards.filter((c) => !isJoker(c));
  if (nonJokerCards.length === 0) return 0;

  if (type === "serie") {
    return nonJokerCards[0].number;
  }

  if (type === "suite") {
    const firstNonJokerIndex = cards.findIndex((c) => !isJoker(c));
    const firstNum =
      cards[firstNonJokerIndex].number - firstNonJokerIndex;
    return firstNum + jokerIndex;
  }

  return 0;
};

export const cardCombinationPoints = (combination: CombinationDto) =>
  combination.cards.reduce(
    (points, card, index) =>
      points +
      (isJoker(card)
        ? resolveJokerValue(combination.cards, index, combination.type)
        : card.number),
    0,
  );

export const cardCombinationsPoints = (combinations: Array<CombinationDto>) =>
  combinations.reduce(
    (points, combination) => points + cardCombinationPoints(combination),
    0,
  );

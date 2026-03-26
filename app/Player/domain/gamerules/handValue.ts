import type { CardListDto } from "@/app/Card/domain/dtos/cardList";
import { isJoker } from "@/app/Card/domain/gamerules/isJoker";

const JOKER_PENALTY_VALUE = 30;

export const handValue = (cards: CardListDto): number =>
  cards.reduce(
    (total, card) => total + (isJoker(card) ? JOKER_PENALTY_VALUE : card.number),
    0,
  );

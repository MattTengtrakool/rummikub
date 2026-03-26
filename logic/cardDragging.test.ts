import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import { makeCardDraggingHandler } from "@/logic/cardDragging";
import { afterEach, describe, expect, test, vi } from "vitest";

const baseObj = {
  placeCardAlone(cardIndex: number) {},
  placeCardInCombination(
    cardIndex: number,
    destination: CardPositionOnBoard
  ) {},
  moveCardAlone(source: CardPositionOnBoard) {},
  moveCardToCombination(
    source: CardPositionOnBoard,
    destination: CardPositionOnBoard
  ) {},
  returnCardToHand(source: CardPositionOnBoard) {},
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cardDragging", () => {
  test("call placeCardAlone when source card and no destination", () => {
    const spy = vi.spyOn(baseObj, "placeCardAlone");
    const cardDraggingHandler = makeCardDraggingHandler(baseObj);

    cardDraggingHandler.to(null, null);
    cardDraggingHandler.from(1, null);

    expect(spy).toHaveBeenCalledWith(1);
  });

  test("call placeCardInCombination when source card and destination card+combination", () => {
    const spy = vi.spyOn(baseObj, "placeCardInCombination");
    const cardDraggingHandler = makeCardDraggingHandler(baseObj);

    cardDraggingHandler.to(1, 1);
    cardDraggingHandler.from(1, null);

    expect(spy).toHaveBeenCalledWith(1, {
      cardIndex: 1,
      combinationIndex: 1,
    });
  });

  test("call moveCardAlone when source card+combination, and no destination", () => {
    const spy = vi.spyOn(baseObj, "moveCardAlone");
    const cardDraggingHandler = makeCardDraggingHandler(baseObj);

    cardDraggingHandler.to(null, null);
    cardDraggingHandler.from(1, 1);

    expect(spy).toHaveBeenCalledWith({
      cardIndex: 1,
      combinationIndex: 1,
    });
  });

  test("call moveCardToCombination when source card+combination, and destination card+combination", () => {
    const spy = vi.spyOn(baseObj, "moveCardToCombination");
    const cardDraggingHandler = makeCardDraggingHandler(baseObj);

    cardDraggingHandler.to(1, 1);
    cardDraggingHandler.from(1, 1);

    expect(spy).toHaveBeenCalledWith(
      {
        cardIndex: 1,
        combinationIndex: 1,
      },
      {
        cardIndex: 1,
        combinationIndex: 1,
      }
    );
  });

  test("call returnCardToHand when source card+combination and destination is hand", () => {
    const spy = vi.spyOn(baseObj, "returnCardToHand");
    const cardDraggingHandler = makeCardDraggingHandler(baseObj);

    cardDraggingHandler.toHand();
    cardDraggingHandler.from(2, 0);

    expect(spy).toHaveBeenCalledWith({
      cardIndex: 2,
      combinationIndex: 0,
    });
  });
});

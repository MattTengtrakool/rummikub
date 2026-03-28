import type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";
import { makeCardDraggingHandler } from "@/logic/cardDragging";
import { afterEach, describe, expect, test, vi } from "vitest";

const baseObj = {
  placeCard(cardIndex: number, position: BoardPosition) {},
  moveCard(from: BoardPosition, to: BoardPosition) {},
  moveCards(moves: Array<{ from: BoardPosition; to: BoardPosition }>) {},
  returnCard(position: BoardPosition) {},
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cardDragging", () => {
  test("call placeCard with card index and position", () => {
    const spy = vi.spyOn(baseObj, "placeCard");
    const handler = makeCardDraggingHandler(baseObj);

    handler.placeCard(1, { x: 3, y: 2 });

    expect(spy).toHaveBeenCalledWith(1, { x: 3, y: 2 });
  });

  test("call moveCard with source and destination positions", () => {
    const spy = vi.spyOn(baseObj, "moveCard");
    const handler = makeCardDraggingHandler(baseObj);

    handler.moveCard({ x: 0, y: 0 }, { x: 5, y: 3 });

    expect(spy).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 5, y: 3 });
  });

  test("call returnCard with board position", () => {
    const spy = vi.spyOn(baseObj, "returnCard");
    const handler = makeCardDraggingHandler(baseObj);

    handler.returnCard({ x: 2, y: 1 });

    expect(spy).toHaveBeenCalledWith({ x: 2, y: 1 });
  });

  test("call onCardPlaced for placeCard", () => {
    const onCardPlaced = vi.fn();
    const handler = makeCardDraggingHandler({ ...baseObj, onCardPlaced });

    handler.placeCard(0, { x: 0, y: 0 });

    expect(onCardPlaced).toHaveBeenCalledOnce();
  });

  test("call onCardPlaced for moveCard", () => {
    const onCardPlaced = vi.fn();
    const handler = makeCardDraggingHandler({ ...baseObj, onCardPlaced });

    handler.moveCard({ x: 0, y: 0 }, { x: 1, y: 1 });

    expect(onCardPlaced).toHaveBeenCalledOnce();
  });

  test("do not call onCardPlaced for returnCard", () => {
    const onCardPlaced = vi.fn();
    const handler = makeCardDraggingHandler({ ...baseObj, onCardPlaced });

    handler.returnCard({ x: 0, y: 0 });

    expect(onCardPlaced).not.toHaveBeenCalled();
  });
});

import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";
import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { snapPosition } from "@/app/GameBoard/domain/gamerules/snapPosition";
import type { CardDraggingHandler } from "@/logic/cardDragging";

const TILE_SM = { w: 40, h: 48 };
const TILE_MD = { w: 48, h: 64 };
const GAP_X = 3;
const GAP_Y = 14;

const isMd = ref(false);

if (typeof window !== "undefined") {
  const mql = window.matchMedia("(min-width: 768px)");
  isMd.value = mql.matches;
  mql.addEventListener("change", (e) => { isMd.value = e.matches; });
}

export const useTileMetrics = () => {
  const tileW = computed(() => isMd.value ? TILE_MD.w : TILE_SM.w);
  const tileH = computed(() => isMd.value ? TILE_MD.h : TILE_SM.h);
  const cellW = computed(() => tileW.value + GAP_X);
  const cellH = computed(() => tileH.value + GAP_Y);
  return { tileW, tileH, cellW, cellH, gapX: GAP_X, gapY: GAP_Y };
};

export type DragSource =
  | { type: "hand"; cardIndex: number }
  | { type: "board"; position: BoardPosition };

export type DragState = {
  active: boolean;
  source: DragSource | null;
  color: CardColor | null;
  number: CardNumber | null;
  pointerX: number;
  pointerY: number;
  previewPosition: BoardPosition | null;
  previewValid: boolean;
};

const initialState: DragState = {
  active: false,
  source: null,
  color: null,
  number: null,
  pointerX: 0,
  pointerY: 0,
  previewPosition: null,
  previewValid: false,
};

const dragState = ref<DragState>({ ...initialState });

export const useTileDrag = () => {
  const { startDragging, stopDragging } = useDraggingCard();
  const { cellW, cellH } = useTileMetrics();

  const startDrag = (
    source: DragSource,
    color: CardColor,
    number: CardNumber,
    clientX: number,
    clientY: number,
  ) => {
    dragState.value = {
      active: true,
      source,
      color,
      number,
      pointerX: clientX,
      pointerY: clientY,
      previewPosition: null,
      previewValid: false,
    };

    startDragging({
      color,
      number,
      sourcePosition:
        source.type === "board" ? source.position : undefined,
    });
  };

  const updateDrag = (
    clientX: number,
    clientY: number,
    boardEl: HTMLElement | null,
    contentEl: HTMLElement | null,
    scale: number,
    translateX: number,
    translateY: number,
    existingTiles: ReadonlyArray<PlacedTileDto>,
  ) => {
    if (!dragState.value.active) return;

    dragState.value.pointerX = clientX;
    dragState.value.pointerY = clientY;

    if (!boardEl || !contentEl) {
      dragState.value.previewPosition = null;
      dragState.value.previewValid = false;
      return;
    }

    const boardRect = boardEl.getBoundingClientRect();
    const isOverBoard =
      clientX >= boardRect.left &&
      clientX <= boardRect.right &&
      clientY >= boardRect.top &&
      clientY <= boardRect.bottom;

    if (!isOverBoard) {
      dragState.value.previewPosition = null;
      dragState.value.previewValid = false;
      return;
    }

    const localX = (clientX - boardRect.left - translateX) / scale;
    const localY = (clientY - boardRect.top - translateY) / scale;

    const tileX = localX / cellW.value - 0.5;
    const tileY = localY / cellH.value - 0.5;

    const rawPosition: BoardPosition = { x: tileX, y: tileY };

    const source = dragState.value.source;
    const filteredTiles =
      source?.type === "board"
        ? existingTiles.filter(
            (t) =>
              Math.abs(t.x - source.position.x) > 0.3 ||
              Math.abs(t.y - source.position.y) > 0.3,
          )
        : existingTiles;

    const snapped = snapPosition(rawPosition, filteredTiles);

    dragState.value.previewPosition = snapped;
    dragState.value.previewValid = true;
  };

  const endDrag = (
    handler: CardDraggingHandler,
    boardEl: HTMLElement | null,
    handEl: HTMLElement | null,
    clientX: number,
    clientY: number,
  ) => {
    if (!dragState.value.active || !dragState.value.source) {
      cancelDrag();
      return;
    }

    const source = dragState.value.source;
    const preview = dragState.value.previewPosition;
    const valid = dragState.value.previewValid;

    const overBoard = boardEl
      ? isOverElement(clientX, clientY, boardEl)
      : false;
    const overHand = handEl
      ? isOverElement(clientX, clientY, handEl)
      : false;

    if (overBoard && preview && valid) {
      if (source.type === "hand") {
        handler.placeCard(source.cardIndex, preview);
      } else {
        handler.moveCard(source.position, preview);
      }
    } else if (overHand && source.type === "board") {
      handler.returnCard(source.position);
    }

    cancelDrag();
  };

  const cancelDrag = () => {
    dragState.value = { ...initialState };
    stopDragging();
  };

  return {
    dragState: readonly(dragState),
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
};

function isOverElement(
  clientX: number,
  clientY: number,
  el: HTMLElement,
): boolean {
  const rect = el.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

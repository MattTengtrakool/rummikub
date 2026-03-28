import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";
import type { BoardPosition, PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { snapPosition, hasCollision } from "@/app/GameBoard/domain/gamerules/snapPosition";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import { useSettings, type CardSize } from "@/composables/useSettings";

const TILE_SIZES: Record<CardSize, { sm: { w: number; h: number }; md: { w: number; h: number } }> = {
  small:  { sm: { w: 34, h: 42 }, md: { w: 42, h: 56 } },
  normal: { sm: { w: 40, h: 48 }, md: { w: 48, h: 64 } },
  large:  { sm: { w: 46, h: 56 }, md: { w: 56, h: 74 } },
};

const GAP_X = 3;
const GAP_Y = 14;

const isMd = ref(false);

if (typeof window !== "undefined") {
  const mql = window.matchMedia("(min-width: 768px)");
  isMd.value = mql.matches;
  mql.addEventListener("change", (e) => { isMd.value = e.matches; });
}

export const useTileMetrics = () => {
  const { cardSize } = useSettings();
  const sizes = computed(() => TILE_SIZES[cardSize.value] ?? TILE_SIZES.normal);
  const tileW = computed(() => isMd.value ? sizes.value.md.w : sizes.value.sm.w);
  const tileH = computed(() => isMd.value ? sizes.value.md.h : sizes.value.sm.h);
  const cellW = computed(() => tileW.value + GAP_X);
  const cellH = computed(() => tileH.value + GAP_Y);
  return { tileW, tileH, cellW, cellH, gapX: GAP_X, gapY: GAP_Y };
};

export type DragSource =
  | { type: "hand"; cardIndex: number }
  | { type: "board"; position: BoardPosition };

export type GroupTile = {
  position: BoardPosition;
  offset: BoardPosition;
  card: { color: CardColor; number: CardNumber };
};

export type DragState = {
  active: boolean;
  source: DragSource | null;
  color: CardColor | null;
  number: CardNumber | null;
  pointerX: number;
  pointerY: number;
  previewPosition: BoardPosition | null;
  previewValid: boolean;
  isGroup: boolean;
  groupTiles: GroupTile[];
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
  isGroup: false,
  groupTiles: [],
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
      isGroup: false,
      groupTiles: [],
    };

    startDragging({
      color,
      number,
      sourcePosition:
        source.type === "board" ? source.position : undefined,
    });
  };

  const startGroupDrag = (
    anchorPosition: BoardPosition,
    anchorColor: CardColor,
    anchorNumber: CardNumber,
    groupTiles: GroupTile[],
    clientX: number,
    clientY: number,
  ) => {
    dragState.value = {
      active: true,
      source: { type: "board", position: anchorPosition },
      color: anchorColor,
      number: anchorNumber,
      pointerX: clientX,
      pointerY: clientY,
      previewPosition: null,
      previewValid: false,
      isGroup: true,
      groupTiles,
    };

    startDragging({
      color: anchorColor,
      number: anchorNumber,
      sourcePosition: anchorPosition,
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

    if (dragState.value.isGroup) {
      const groupPositions = new Set(
        dragState.value.groupTiles.map(
          (gt) => `${Math.round(gt.position.x)},${Math.round(gt.position.y)}`,
        ),
      );
      const filteredTiles = existingTiles.filter(
        (t) => !groupPositions.has(`${Math.round(t.x)},${Math.round(t.y)}`),
      );

      const snapped = snapPosition(rawPosition, filteredTiles);

      const allValid = dragState.value.groupTiles.every((gt) => {
        const dest = {
          x: snapped.x + gt.offset.x,
          y: snapped.y + gt.offset.y,
        };
        return !hasCollision(dest, filteredTiles);
      });

      dragState.value.previewPosition = snapped;
      dragState.value.previewValid = allValid;
    } else {
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
    }
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
    const isGroup = dragState.value.isGroup;
    const groupTiles = dragState.value.groupTiles;

    const overBoard = boardEl
      ? isOverElement(clientX, clientY, boardEl)
      : false;
    const overHand = handEl
      ? isOverElement(clientX, clientY, handEl)
      : false;

    if (overBoard && preview && valid) {
      if (isGroup && source.type === "board") {
        const moves = groupTiles.map((gt) => ({
          from: gt.position,
          to: {
            x: preview.x + gt.offset.x,
            y: preview.y + gt.offset.y,
          },
        }));
        handler.moveCards(moves);
      } else if (source.type === "hand") {
        handler.placeCard(source.cardIndex, preview);
      } else {
        handler.moveCard(source.position, preview);
      }
    } else if (overHand && source.type === "board" && !isGroup) {
      handler.returnCard(source.position);
    }

    cancelDrag();
  };

  const cancelDrag = () => {
    dragState.value = { ...initialState, groupTiles: [] };
    stopDragging();
  };

  return {
    dragState: readonly(dragState),
    startDrag,
    startGroupDrag,
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

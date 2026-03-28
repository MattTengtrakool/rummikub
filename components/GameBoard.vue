<script setup lang="ts">
import type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  CursorPosition,
  RemoteCursor,
} from "@/app/WebSocket/infrastructure/types";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon } from "@heroicons/vue/20/solid";
import { useBoardZoom } from "@/composables/useBoardZoom";
import { useTileDrag, useTileMetrics, type GroupTile } from "@/composables/useTileDrag";
import { hasCollision, shiftTilesForInsertion } from "@/app/GameBoard/domain/gamerules/snapPosition";
import type { PlacedTileDto, DetectedCombinationDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { useSettings } from "@/composables/useSettings";

const props = defineProps<{
  highlightedCard?: BoardPosition;
  player: PlayerDto;
  gameBoard: GameBoardDto;
  cardDraggingHandler: CardDraggingHandler;
  remoteCursors: Map<string, RemoteCursor>;
  moveCursor: (position: CursorPosition) => void;
}>();

const boardRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const { draggingCard } = useDraggingCard();
const { dragState, startDrag, startGroupDrag, updateDrag, endDrag } = useTileDrag();
const { tileW, tileH, cellW, cellH } = useTileMetrics();

const zoom = useBoardZoom();
const { boardTheme, showCursors } = useSettings();

const shiftHeld = ref(false);
const hoveredTilePos = ref<{ x: number; y: number } | null>(null);

const groupHighlightPositions = computed(() => {
  if (!shiftHeld.value || !hoveredTilePos.value || !props.player.isPlaying) return new Set<string>();
  if (!props.player.canMoveCard) return new Set<string>();

  for (const combo of props.gameBoard.combinations) {
    if (combo.tiles.length < 2) continue;
    const match = combo.tiles.some(
      (ct) =>
        Math.abs(ct.x - hoveredTilePos.value!.x) < 0.3 &&
        Math.abs(ct.y - hoveredTilePos.value!.y) < 0.3,
    );
    if (match) {
      return new Set(combo.tiles.map((ct) => `${Math.round(ct.x)},${Math.round(ct.y)}`));
    }
  }
  return new Set<string>();
});

const isGroupHighlighted = (tile: { x: number; y: number }) =>
  groupHighlightPositions.value.has(`${Math.round(tile.x)},${Math.round(tile.y)}`);

const groupHintStyle = computed(() => {
  if (groupHighlightPositions.value.size === 0 || !hoveredTilePos.value) {
    return { display: "none" };
  }
  const screenX =
    hoveredTilePos.value.x * cellW.value * zoom.scale.value +
    zoom.translateX.value;
  const screenY =
    hoveredTilePos.value.y * cellH.value * zoom.scale.value +
    zoom.translateY.value;
  return {
    left: screenX + "px",
    top: Math.max(4, screenY - 28) + "px",
  };
});

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Shift") shiftHeld.value = true;
};
const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === "Shift") shiftHeld.value = false;
};

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
});

let lastEmit = 0;
const THROTTLE_MS = 30;

const emitCursor = (clientX: number, clientY: number) => {
  const now = Date.now();
  if (now - lastEmit < THROTTLE_MS) return;
  lastEmit = now;

  const rect = boardRef.value?.getBoundingClientRect();
  if (!rect) return;

  const localX = (clientX - rect.left - zoom.translateX.value) / zoom.scale.value;
  const localY = (clientY - rect.top - zoom.translateY.value) / zoom.scale.value;

  props.moveCursor({
    x: localX / cellW.value,
    y: localY / cellH.value,
    draggingCard: draggingCard.value ?? undefined,
  });
};

const updateHoveredTile = (clientX: number, clientY: number) => {
  const rect = boardRef.value?.getBoundingClientRect();
  if (!rect) { hoveredTilePos.value = null; return; }

  const localX = (clientX - rect.left - zoom.translateX.value) / zoom.scale.value;
  const localY = (clientY - rect.top - zoom.translateY.value) / zoom.scale.value;

  const tileX = Math.round(localX / cellW.value - 0.5);
  const tileY = Math.round(localY / cellH.value - 0.5);

  const hit = props.gameBoard.tiles.some(
    (t) => Math.abs(t.x - tileX) < 0.6 && Math.abs(t.y - tileY) < 0.6,
  );
  hoveredTilePos.value = hit ? { x: tileX, y: tileY } : null;
};

const handleMouseMove = (e: MouseEvent) => {
  emitCursor(e.clientX, e.clientY);
  if (shiftHeld.value) updateHoveredTile(e.clientX, e.clientY);

  if (dragState.value.active) {
    updateDrag(
      e.clientX,
      e.clientY,
      boardRef.value,
      contentRef.value,
      zoom.scale.value,
      zoom.translateX.value,
      zoom.translateY.value,
      props.gameBoard.tiles,
    );
  }
};

const handleMouseLeave = () => {
  hoveredTilePos.value = null;
  if (draggingCard.value) return;
  props.moveCursor({ x: -1, y: -1 });
};

const handlePointerUp = (e: PointerEvent) => {
  clearLongPress();
  if (dragState.value.active) {
    const handEl = document.querySelector("[data-player-deck]") as HTMLElement | null;
    endDrag(
      props.cardDraggingHandler,
      boardRef.value,
      handEl,
      e.clientX,
      e.clientY,
    );
    props.moveCursor({ x: -1, y: -1 });
    return;
  }
  zoom.onPointerUp();
};

const handleDocumentPointerMove = (e: PointerEvent) => {
  if (dragState.value.active) {
    if (longPressTimer && dragState.value.source?.type === "board") {
      const dx = e.clientX - dragState.value.pointerX;
      const dy = e.clientY - dragState.value.pointerY;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD) {
        clearLongPress();
      }
    }
    updateDrag(
      e.clientX,
      e.clientY,
      boardRef.value,
      contentRef.value,
      zoom.scale.value,
      zoom.translateX.value,
      zoom.translateY.value,
      props.gameBoard.tiles,
    );
    emitCursor(e.clientX, e.clientY);
  }
};

const handleDocumentPointerUp = (e: PointerEvent) => {
  clearLongPress();
  if (dragState.value.active) {
    const handEl = document.querySelector("[data-player-deck]") as HTMLElement | null;
    endDrag(
      props.cardDraggingHandler,
      boardRef.value,
      handEl,
      e.clientX,
      e.clientY,
    );
    props.moveCursor({ x: -1, y: -1 });
  }
};

const handleBoardPointerDown = (e: PointerEvent) => {
  emitCursor(e.clientX, e.clientY);
  if (dragState.value.active) return;
  zoom.onPointerDown(e, !!draggingCard.value);
};

const handleBoardPointerMove = (e: PointerEvent) => {
  zoom.onPointerMove(e);
  emitCursor(e.clientX, e.clientY);
};

const handleBoardTouchMove = (e: TouchEvent) => {
  zoom.onTouchMove(e);
  if (e.touches.length > 0) {
    emitCursor(e.touches[0].clientX, e.touches[0].clientY);
  }
};

const handleBoardTouchEnd = (e: TouchEvent) => {
  zoom.onTouchEnd(e);
  if (e.touches.length === 0 && !dragState.value.active) {
    props.moveCursor({ x: -1, y: -1 });
  }
};

const findCombinationForTile = (
  tile: { x: number; y: number },
): DetectedCombinationDto | null => {
  for (const combo of props.gameBoard.combinations) {
    if (combo.tiles.length < 2) continue;
    const match = combo.tiles.some(
      (ct) => Math.abs(ct.x - tile.x) < 0.3 && Math.abs(ct.y - tile.y) < 0.3,
    );
    if (match) return combo;
  }
  return null;
};

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

const clearLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const buildGroupTiles = (
  combo: DetectedCombinationDto,
  anchorTile: { x: number; y: number },
): GroupTile[] =>
  combo.tiles.map((ct) => ({
    position: { x: ct.x, y: ct.y },
    offset: {
      x: Math.round(ct.x) - Math.round(anchorTile.x),
      y: Math.round(ct.y) - Math.round(anchorTile.y),
    },
    card: { color: ct.card.color, number: ct.card.number },
  }));

const handleTilePointerDown = (e: PointerEvent, tile: { x: number; y: number; card: { color: any; number: any } }) => {
  e.preventDefault();
  e.stopPropagation();

  if (!props.player.isPlaying) return;
  if (!props.player.canMoveCard && !props.player.canReturnCard) return;

  if (e.shiftKey) {
    const combo = findCombinationForTile(tile);
    if (combo && combo.tiles.length >= 2) {
      startGroupDrag(
        { x: tile.x, y: tile.y },
        tile.card.color,
        tile.card.number,
        buildGroupTiles(combo, tile),
        e.clientX,
        e.clientY,
      );
      return;
    }
  }

  clearLongPress();
  const startX = e.clientX;
  const startY = e.clientY;

  const combo = findCombinationForTile(tile);
  if (combo && combo.tiles.length >= 2) {
    longPressTimer = setTimeout(() => {
      longPressTimer = null;

      const dx = dragState.value.pointerX - startX;
      const dy = dragState.value.pointerY - startY;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD) return;

      startGroupDrag(
        { x: tile.x, y: tile.y },
        tile.card.color,
        tile.card.number,
        buildGroupTiles(combo, tile),
        dragState.value.pointerX,
        dragState.value.pointerY,
      );

      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }

  startDrag(
    { type: "board", position: { x: tile.x, y: tile.y } },
    tile.card.color,
    tile.card.number,
    e.clientX,
    e.clientY,
  );
};

const handleFit = () => {
  const tiles = props.gameBoard.tiles;
  if (tiles.length === 0) {
    zoom.resetZoom();
    return;
  }
  const minX = Math.min(...tiles.map((t) => t.x));
  const minY = Math.min(...tiles.map((t) => t.y));
  const maxX = Math.max(...tiles.map((t) => t.x));
  const maxY = Math.max(...tiles.map((t) => t.y));

  zoom.fitToScreen(boardRef.value, {
    x: minX * cellW.value,
    y: minY * cellH.value,
    width: (maxX - minX + 1) * cellW.value,
    height: (maxY - minY + 1) * cellH.value,
  });
};

const contentStyleStr = computed(() => zoom.transformStyle.value);

const cursorEntries = computed(() => {
  const entries: Array<{ username: string; cursor: RemoteCursor; index: number }> = [];
  let i = 0;
  for (const [username, cursor] of props.remoteCursors) {
    if (cursor.x >= 0 && cursor.y >= 0) {
      entries.push({ username, cursor, index: i });
    }
    i++;
  }
  return entries;
});


watch(
  () => props.highlightedCard,
  (pos) => {
    if (!pos || props.player.isPlaying) return;
    if (zoom.isPositionInView(pos.x, pos.y, cellW.value, cellH.value, boardRef.value)) return;

    const tiles = props.gameBoard.tiles;
    if (tiles.length === 0) return;

    const minX = Math.min(...tiles.map((t) => t.x));
    const minY = Math.min(...tiles.map((t) => t.y));
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));

    zoom.smoothFitToScreen(boardRef.value, {
      x: minX * cellW.value,
      y: minY * cellH.value,
      width: (maxX - minX + 1) * cellW.value,
      height: (maxY - minY + 1) * cellH.value,
    });
  },
);

const isHighlighted = (tile: PlacedTileDto) => {
  if (opponentNewTileKeys.value.has(tileKey(tile))) return true;
  if (!props.highlightedCard) return false;
  return (
    Math.abs(tile.x - props.highlightedCard.x) < 0.3 &&
    Math.abs(tile.y - props.highlightedCard.y) < 0.3
  );
};

const isDragSource = (tile: { x: number; y: number }) => {
  if (!dragState.value.active || dragState.value.source?.type !== "board")
    return false;

  if (dragState.value.isGroup) {
    return dragState.value.groupTiles.some(
      (gt) =>
        Math.abs(tile.x - gt.position.x) < 0.3 &&
        Math.abs(tile.y - gt.position.y) < 0.3,
    );
  }

  const src = dragState.value.source.position;
  return Math.abs(tile.x - src.x) < 0.3 && Math.abs(tile.y - src.y) < 0.3;
};

const opponentDragPositions = computed(() => {
  const positions: BoardPosition[] = [];
  for (const [, cursor] of props.remoteCursors) {
    if (cursor.draggingCard?.sourcePosition) {
      positions.push(cursor.draggingCard.sourcePosition);
    }
  }
  return positions;
});

const isOpponentDragging = (tile: { x: number; y: number }) => {
  return opponentDragPositions.value.some(
    (p) => Math.abs(tile.x - p.x) < 0.3 && Math.abs(tile.y - p.y) < 0.3,
  );
};

const CONTENT_PADDING = 10;

const contentDimensions = computed(() => {
  const tiles = props.gameBoard.tiles;
  if (tiles.length === 0) {
    return { width: "100%", height: "100%" };
  }
  const maxX = Math.max(...tiles.map((t) => t.x));
  const maxY = Math.max(...tiles.map((t) => t.y));
  const w = (maxX + 1 + CONTENT_PADDING) * cellW.value;
  const h = (maxY + 1 + CONTENT_PADDING) * cellH.value;
  return {
    width: Math.max(w, 2000) + "px",
    height: Math.max(h, 1200) + "px",
  };
});

const invalidOutlines = computed(() => {
  const cw = cellW.value;
  const ch = cellH.value;
  const tw = tileW.value;
  const th = tileH.value;
  const pad = 5;
  return props.gameBoard.combinations
    .filter((combo) => combo.type === "invalid")
    .map((combo) => {
      const xs = combo.tiles.map((t) => t.x);
      const ys = combo.tiles.map((t) => t.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        left: minX * cw - pad,
        top: minY * ch - pad,
        width: (maxX - minX) * cw + tw + pad * 2,
        height: (maxY - minY) * ch + th + pad * 2,
      };
    });
});

const recentlyPlaced = ref(new Set<string>());

const tileKey = (tile: { card: { color: string; number: number; duplicata: number } }) =>
  `${tile.card.color}-${tile.card.number}-${tile.card.duplicata}`;

const turnStartTileKeys = ref(new Set<string>());
const turnEndTileKeys = ref(new Set(props.gameBoard.tiles.map(tileKey)));
const opponentNewTileKeys = ref(new Set<string>());
let opponentHighlightTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.player.isPlaying,
  (playing, wasPlaying) => {
    if (playing) {
      const newKeys = props.gameBoard.tiles
        .map(tileKey)
        .filter((k) => !turnEndTileKeys.value.has(k));

      if (newKeys.length > 0) {
        opponentNewTileKeys.value = new Set(newKeys);
        if (opponentHighlightTimer) clearTimeout(opponentHighlightTimer);
        opponentHighlightTimer = setTimeout(() => {
          opponentNewTileKeys.value = new Set();
        }, 1800);
      }

      turnStartTileKeys.value = new Set(props.gameBoard.tiles.map(tileKey));
    } else if (wasPlaying) {
      turnEndTileKeys.value = new Set(props.gameBoard.tiles.map(tileKey));
    }
  },
  { immediate: true },
);

const wasOnBoardBeforeTurn = (tile: PlacedTileDto) =>
  turnStartTileKeys.value.has(tileKey(tile));

watch(
  () => props.gameBoard.tiles,
  (newTiles, oldTiles) => {
    if (!oldTiles) return;
    const oldKeys = new Set(oldTiles.map(tileKey));
    const fresh = newTiles.filter((t) => !oldKeys.has(tileKey(t)));
    if (fresh.length > 0) {
      for (const t of fresh) recentlyPlaced.value.add(tileKey(t));
      setTimeout(() => {
        for (const t of fresh) recentlyPlaced.value.delete(tileKey(t));
      }, 200);
    }
  },
);

const visualTiles = computed<PlacedTileDto[]>(() => {
  const tiles = props.gameBoard.tiles;
  const state = dragState.value;

  if (!state.active || !state.previewPosition || !state.previewValid) {
    return tiles;
  }

  const preview = state.previewPosition;
  const source = state.source;

  if (state.isGroup && source?.type === "board") {
    const groupPositions = new Set(
      state.groupTiles.map(
        (gt) => `${Math.round(gt.position.x)},${Math.round(gt.position.y)}`,
      ),
    );

    const cloned = tiles
      .filter(
        (t) => !groupPositions.has(`${Math.round(t.x)},${Math.round(t.y)}`),
      )
      .map((t) => ({ ...t, card: { ...t.card } }));

    for (const gt of state.groupTiles) {
      const origTile = tiles.find(
        (t) =>
          Math.abs(t.x - gt.position.x) < 0.3 &&
          Math.abs(t.y - gt.position.y) < 0.3,
      );
      if (origTile) {
        cloned.push({
          ...origTile,
          card: { ...origTile.card },
          x: preview.x + gt.offset.x,
          y: preview.y + gt.offset.y,
        });
      }
    }

    return cloned;
  }

  const cloned = tiles
    .filter((t) => {
      if (source?.type === "board") {
        return (
          Math.abs(t.x - source.position.x) > 0.3 ||
          Math.abs(t.y - source.position.y) > 0.3
        );
      }
      return true;
    })
    .map((t) => ({ ...t, card: { ...t.card } }));

  if (hasCollision(preview, cloned)) {
    shiftTilesForInsertion(preview, cloned);
  }

  if (source?.type === "board") {
    const sourceTile = tiles.find(
      (t) =>
        Math.abs(t.x - source.position.x) < 0.3 &&
        Math.abs(t.y - source.position.y) < 0.3,
    );
    if (sourceTile) {
      cloned.push({ ...sourceTile, card: { ...sourceTile.card } });
    }
  }

  return cloned;
});

const visualPosition = (tile: PlacedTileDto) => {
  const vt = visualTiles.value.find(
    (v) =>
      v.card.color === tile.card.color &&
      v.card.number === tile.card.number &&
      v.card.duplicata === tile.card.duplicata,
  );
  return vt ? { x: vt.x, y: vt.y } : { x: tile.x, y: tile.y };
};

onMounted(() => {
  document.addEventListener("pointermove", handleDocumentPointerMove);
  document.addEventListener("pointerup", handleDocumentPointerUp);
});

onUnmounted(() => {
  clearLongPress();
  document.removeEventListener("pointermove", handleDocumentPointerMove);
  document.removeEventListener("pointerup", handleDocumentPointerUp);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
});
</script>
<template>
  <div
    ref="boardRef"
    class="board-surface overflow-hidden flex-1 relative"
    :class="`board-theme-${boardTheme}`"
    style="touch-action: none;"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @wheel="zoom.onWheel"
    @pointerdown="handleBoardPointerDown"
    @pointermove="handleBoardPointerMove"
    @pointerup="handlePointerUp"
    @touchstart="(e: TouchEvent) => zoom.onTouchStart(e, !!draggingCard || dragState.active)"
    @touchmove="handleBoardTouchMove"
    @touchend="handleBoardTouchEnd"
  >
    <div
      ref="contentRef"
      class="relative min-w-full min-h-full will-change-transform"
      :class="{ 'smooth-pan': zoom.smoothPanning.value }"
      :style="contentStyleStr + `; width: ${contentDimensions.width}; height: ${contentDimensions.height};`"
    >
      <!-- Invalid combination outlines -->
      <div
        v-for="(outline, idx) in invalidOutlines"
        :key="'combo-' + idx"
        class="absolute rounded-xl pointer-events-none combo-outline"
        :style="{
          left: outline.left + 'px',
          top: outline.top + 'px',
          width: outline.width + 'px',
          height: outline.height + 'px',
        }"
      />

      <!-- Snap preview ghost(s) -->
      <template v-if="dragState.active && dragState.previewPosition && dragState.isGroup">
        <div
          v-for="(gt, gi) in dragState.groupTiles"
          :key="'gp-' + gi"
          class="absolute pointer-events-none snap-preview"
          :style="{
            left: (dragState.previewPosition.x + gt.offset.x) * cellW + 'px',
            top: (dragState.previewPosition.y + gt.offset.y) * cellH + 'px',
          }"
        >
          <Card
            :color="gt.card.color"
            :number="gt.card.number"
            class="opacity-40"
            :class="[
              dragState.previewValid
                ? 'shadow-[0_0_0_2px_rgba(52,211,153,0.5)]'
                : 'shadow-[0_0_0_2px_rgba(248,113,113,0.5)]'
            ]"
          />
        </div>
      </template>
      <div
        v-else-if="dragState.active && dragState.previewPosition && dragState.color && dragState.number != null"
        class="absolute pointer-events-none snap-preview"
        :style="{
          left: dragState.previewPosition.x * cellW + 'px',
          top: dragState.previewPosition.y * cellH + 'px',
        }"
      >
        <Card
          :color="dragState.color"
          :number="dragState.number"
          class="opacity-40"
          :class="[
            dragState.previewValid
              ? 'shadow-[0_0_0_2px_rgba(52,211,153,0.5)]'
              : 'shadow-[0_0_0_2px_rgba(248,113,113,0.5)]'
          ]"
        />
      </div>

      <!-- Placed tiles -->
      <div
        v-for="tile in gameBoard.tiles"
        :key="tileKey(tile)"
        class="absolute tile-positioned"
        :class="{
          'tile-lift': isDragSource(tile),
          'group-highlight': isGroupHighlighted(tile),
        }"
        :style="{
          left: visualPosition(tile).x * cellW + 'px',
          top: visualPosition(tile).y * cellH + 'px',
        }"
        @pointerdown="(e) => handleTilePointerDown(e, tile)"
      >
        <Card
          :color="tile.card.color"
          :number="tile.card.number"
          :movable="player.isPlaying && (player.canMoveCard || player.canReturnCard)"
          :locked="player.isPlaying && !player.hasStarted && wasOnBoardBeforeTurn(tile)"
          :highlighted="isHighlighted(tile)"
          :dimmed="isOpponentDragging(tile)"
          :animate="recentlyPlaced.has(tileKey(tile))"
        />
      </div>
    </div>

    <!-- Opponent cursors -->
    <OpponentCursor
      v-for="entry in cursorEntries"
      v-show="showCursors"
      :key="entry.username"
      :cursor="{
        ...entry.cursor,
        x: entry.cursor.x * cellW * zoom.scale.value + zoom.translateX.value,
        y: entry.cursor.y * cellH * zoom.scale.value + zoom.translateY.value,
      }"
      :color-index="entry.index"
    />

    <!-- Group drag hint tooltip -->
    <Transition name="group-hint">
      <div
        v-if="groupHighlightPositions.size > 0 && !dragState.active"
        class="absolute z-40 pointer-events-none whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-gray-800/90 text-white text-[11px] font-medium shadow-lg backdrop-blur-sm"
        :style="groupHintStyle"
      >
        {{ $t('components.card.group_drag_hint') }}
      </div>
    </Transition>

    <!-- Zoom controls -->
    <div class="absolute bottom-2 right-2 flex gap-1 z-50 pointer-events-auto">
      <button
        @click.stop="zoom.zoomIn(boardRef)"
        class="size-8 md:size-6 rounded-md shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all board-control"
        title="Zoom in"
      >
        <MagnifyingGlassPlusIcon class="size-4 md:size-3.5" />
      </button>
      <button
        @click.stop="zoom.zoomOut(boardRef)"
        class="size-8 md:size-6 rounded-md shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all board-control"
        title="Zoom out"
      >
        <MagnifyingGlassMinusIcon class="size-4 md:size-3.5" />
      </button>
      <button
        @click.stop="handleFit"
        class="size-8 md:size-6 rounded-md shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all board-control"
        title="Fit to screen"
      >
        <ArrowsPointingOutIcon class="size-4 md:size-3.5" />
      </button>
    </div>

    <!-- Board vignette overlay -->
    <div class="absolute inset-0 pointer-events-none board-vignette" />
  </div>

  <!-- Floating drag clone -->
  <Teleport to="body">
    <template v-if="dragState.active && dragState.isGroup && dragState.groupTiles.length > 0">
      <div
        class="fixed top-0 left-0 pointer-events-none z-[9999] drag-clone will-change-transform"
        :style="{
          transform: `translate(${dragState.pointerX - tileW / 2}px, ${dragState.pointerY - tileH * 0.7}px) scale(1.05) rotate(1deg)`,
        }"
      >
        <div class="relative" :style="{ width: ((dragState.groupTiles.length - 1) * cellW + tileW) + 'px', height: tileH + 'px' }">
          <div
            v-for="(gt, gi) in dragState.groupTiles"
            :key="'gc-' + gi"
            class="absolute"
            :style="{
              left: gt.offset.x * cellW + 'px',
              top: gt.offset.y * cellH + 'px',
            }"
          >
            <Card :color="gt.card.color" :number="gt.card.number" />
          </div>
        </div>
      </div>
    </template>
    <div
      v-else-if="dragState.active && dragState.color && dragState.number != null"
      class="fixed top-0 left-0 pointer-events-none z-[9999] drag-clone will-change-transform"
      :style="{
        transform: `translate(${dragState.pointerX - tileW / 2}px, ${dragState.pointerY - tileH * 0.7}px) scale(1.08) rotate(1.5deg)`,
      }"
    >
      <Card
        :color="dragState.color"
        :number="dragState.number"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.board-surface {
  background-size: 20px 20px;
}

.board-theme-light {
  --board-bg: #F0EDE6;
  --board-dot: #D8D5CE;
  --board-shadow: rgba(0, 0, 0, 0.06);
  --board-vignette: rgba(0, 0, 0, 0.04);
  --combo-invalid-bg: rgba(254, 226, 226, 0.5);
  --combo-invalid-border: rgba(239, 68, 68, 0.2);
  --board-control-bg: rgba(255, 255, 255, 0.9);
  --board-control-border: rgba(0, 0, 0, 0.1);
  --board-control-hover: rgba(0, 0, 0, 0.06);
  --board-control-text: #44403c;
}

.board-theme-dark {
  --board-bg: #2C2A27;
  --board-dot: #3D3A35;
  --board-shadow: rgba(0, 0, 0, 0.25);
  --board-vignette: rgba(0, 0, 0, 0.1);
  --combo-invalid-bg: rgba(239, 68, 68, 0.15);
  --combo-invalid-border: rgba(239, 68, 68, 0.4);
  --board-control-bg: rgba(60, 56, 52, 0.9);
  --board-control-border: rgba(255, 255, 255, 0.12);
  --board-control-hover: rgba(255, 255, 255, 0.1);
  --board-control-text: #d6d3d1;
}

.board-theme-green {
  --board-bg: #2D5A3D;
  --board-dot: #3A6B4C;
  --board-shadow: rgba(0, 0, 0, 0.15);
  --board-vignette: rgba(0, 0, 0, 0.1);
  --combo-invalid-bg: rgba(239, 68, 68, 0.15);
  --combo-invalid-border: rgba(239, 68, 68, 0.45);
  --board-control-bg: rgba(35, 70, 48, 0.9);
  --board-control-border: rgba(255, 255, 255, 0.15);
  --board-control-hover: rgba(255, 255, 255, 0.1);
  --board-control-text: #d1d5db;
}

.board-theme-light,
.board-theme-dark,
.board-theme-green {
  background-color: var(--board-bg);
  background-image: radial-gradient(circle, var(--board-dot) 0.6px, transparent 0.6px);
  box-shadow: inset 0 2px 12px var(--board-shadow);
}

.board-vignette {
  background: radial-gradient(ellipse at center, transparent 60%, var(--board-vignette) 100%);
}

.tile-positioned {
  transition: left 150ms ease, top 150ms ease, transform 150ms ease, opacity 150ms ease;
}

.tile-lift {
  transform: scale(0.85);
  opacity: 0.3;
  transition: transform 120ms ease-out, opacity 120ms ease-out;
}

.combo-outline {
  background-color: var(--combo-invalid-bg);
  box-shadow: inset 0 0 0 1.5px var(--combo-invalid-border);
  transition: left 150ms ease, top 150ms ease, width 150ms ease, height 150ms ease, background-color 200ms ease, box-shadow 200ms ease;
}

.snap-preview {
  /* No position transition — snaps instantly to the computed grid slot */
}

.smooth-pan {
  transition: transform 350ms ease-out;
}

.board-control {
  background-color: var(--board-control-bg);
  border: 1px solid var(--board-control-border);
  color: var(--board-control-text);
}

.board-control:hover {
  background-color: var(--board-control-hover);
}

.group-highlight {
  z-index: 5;
  transform: translateY(-2px);
  filter: drop-shadow(0 2px 6px rgba(59, 130, 246, 0.35));
  transition: transform 120ms ease-out, filter 120ms ease-out;
}

.group-hint-enter-active {
  transition: opacity 100ms ease-out, transform 100ms ease-out;
}
.group-hint-leave-active {
  transition: opacity 80ms ease-in;
}
.group-hint-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.group-hint-leave-to {
  opacity: 0;
}

.drag-clone {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.18));
}
</style>

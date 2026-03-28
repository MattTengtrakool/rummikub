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
import { useTileDrag, useTileMetrics } from "@/composables/useTileDrag";
import { hasCollision, shiftTilesForInsertion } from "@/app/GameBoard/domain/gamerules/snapPosition";
import type { PlacedTileDto } from "@/app/GameBoard/domain/dtos/gameBoard";

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
const { dragState, startDrag, updateDrag, endDrag } = useTileDrag();
const { tileW, tileH, cellW, cellH } = useTileMetrics();

const zoom = useBoardZoom();

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

const handleMouseMove = (e: MouseEvent) => {
  emitCursor(e.clientX, e.clientY);

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
  if (draggingCard.value) return;
  props.moveCursor({ x: -1, y: -1 });
};

const handlePointerUp = (e: PointerEvent) => {
  if (dragState.value.active) {
    const handEl = document.querySelector("[data-player-deck]") as HTMLElement | null;
    endDrag(
      props.cardDraggingHandler,
      boardRef.value,
      handEl,
      e.clientX,
      e.clientY,
    );
    return;
  }
  zoom.onPointerUp();
};

const handleDocumentPointerMove = (e: PointerEvent) => {
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
    emitCursor(e.clientX, e.clientY);
  }
};

const handleDocumentPointerUp = (e: PointerEvent) => {
  if (dragState.value.active) {
    const handEl = document.querySelector("[data-player-deck]") as HTMLElement | null;
    endDrag(
      props.cardDraggingHandler,
      boardRef.value,
      handEl,
      e.clientX,
      e.clientY,
    );
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

const handleTilePointerDown = (e: PointerEvent, tile: { x: number; y: number; card: { color: any; number: any } }) => {
  e.preventDefault();
  e.stopPropagation();

  if (!props.player.isPlaying) return;
  if (!props.player.canMoveCard && !props.player.canReturnCard) return;

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

const isHighlighted = (tile: { x: number; y: number }) => {
  if (!props.highlightedCard) return false;
  return (
    Math.abs(tile.x - props.highlightedCard.x) < 0.3 &&
    Math.abs(tile.y - props.highlightedCard.y) < 0.3
  );
};

const isDragSource = (tile: { x: number; y: number }) => {
  if (!dragState.value.active || dragState.value.source?.type !== "board")
    return false;
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

watch(
  () => props.player.isPlaying,
  (playing) => {
    if (playing) {
      turnStartTileKeys.value = new Set(props.gameBoard.tiles.map(tileKey));
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
  document.removeEventListener("pointermove", handleDocumentPointerMove);
  document.removeEventListener("pointerup", handleDocumentPointerUp);
});
</script>
<template>
  <div
    ref="boardRef"
    class="board-surface overflow-hidden flex-1 relative"
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
        class="absolute rounded-xl pointer-events-none combo-outline bg-red-50/50 shadow-[inset_0_0_0_1.5px_rgba(239,68,68,0.2)]"
        :style="{
          left: outline.left + 'px',
          top: outline.top + 'px',
          width: outline.width + 'px',
          height: outline.height + 'px',
        }"
      />

      <!-- Snap preview ghost -->
      <div
        v-if="dragState.active && dragState.previewPosition && dragState.color && dragState.number != null"
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
        :class="{ 'tile-lift': isDragSource(tile) }"
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
      :key="entry.username"
      :cursor="{
        ...entry.cursor,
        x: entry.cursor.x * cellW * zoom.scale.value + zoom.translateX.value,
        y: entry.cursor.y * cellH * zoom.scale.value + zoom.translateY.value,
      }"
      :color-index="entry.index"
    />

    <!-- Zoom controls -->
    <div class="absolute bottom-2 right-2 flex gap-1 z-50 pointer-events-auto">
      <button
        @click.stop="zoom.zoomIn(boardRef)"
        class="size-8 md:size-6 rounded-md bg-card-bg border border-card-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
        title="Zoom in"
      >
        <MagnifyingGlassPlusIcon class="size-4 md:size-3.5" />
      </button>
      <button
        @click.stop="zoom.zoomOut(boardRef)"
        class="size-8 md:size-6 rounded-md bg-card-bg border border-card-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
        title="Zoom out"
      >
        <MagnifyingGlassMinusIcon class="size-4 md:size-3.5" />
      </button>
      <button
        @click.stop="handleFit"
        class="size-8 md:size-6 rounded-md bg-card-bg border border-card-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
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
    <div
      v-if="dragState.active && dragState.color && dragState.number != null"
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
  background-color: #F0EDE6;
  background-image: radial-gradient(circle, #D8D5CE 0.6px, transparent 0.6px);
  background-size: 20px 20px;
  box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.06);
}

.board-vignette {
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.04) 100%);
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
  transition: left 150ms ease, top 150ms ease, width 150ms ease, height 150ms ease, background-color 200ms ease, box-shadow 200ms ease;
}

.snap-preview {
  /* No position transition — snaps instantly to the computed grid slot */
}

.smooth-pan {
  transition: transform 350ms ease-out;
}

.drag-clone {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.18));
}
</style>

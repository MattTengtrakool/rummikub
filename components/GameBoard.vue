<script setup lang="ts">
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  CursorPosition,
  RemoteCursor,
} from "@/app/WebSocket/infrastructure/types";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon } from "@heroicons/vue/20/solid";
import { useBoardZoom } from "@/composables/useBoardZoom";

const props = defineProps<{
  highlightedCard?: CardPositionOnBoard;
  player: PlayerDto;
  gameBoard: GameBoardDto;
  cardDraggingHandler: CardDraggingHandler;
  remoteCursors: Map<string, RemoteCursor>;
  moveCursor: (position: CursorPosition) => void;
}>();

const boardRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const { draggingCard } = useDraggingCard();

const zoom = useBoardZoom();

let lastEmit = 0;
const THROTTLE_MS = 30;

const opponentDraggedCards = computed(() => {
  const result = new Map<number, number>();
  for (const [, cursor] of props.remoteCursors) {
    const src = cursor.draggingCard?.sourcePosition;
    if (src) {
      result.set(src.combinationIndex, src.cardIndex);
    }
  }
  return result;
});

const emitCursor = (clientX: number, clientY: number) => {
  const now = Date.now();
  if (now - lastEmit < THROTTLE_MS) return;
  lastEmit = now;

  const rect = boardRef.value?.getBoundingClientRect();
  if (!rect) return;

  const x = (clientX - rect.left - zoom.translateX.value) / (rect.width * zoom.scale.value);
  const y = (clientY - rect.top - zoom.translateY.value) / (rect.height * zoom.scale.value);

  props.moveCursor({
    x,
    y,
    draggingCard: draggingCard.value ?? undefined,
  });
};

const handleMouseMove = (e: MouseEvent) => {
  emitCursor(e.clientX, e.clientY);
};

const handleMouseLeave = () => {
  if (draggingCard.value) return;
  props.moveCursor({ x: -1, y: -1 });
};

const handleDocumentDragOver = (e: DragEvent) => {
  if (!draggingCard.value) return;
  emitCursor(e.clientX, e.clientY);
};

const handleDragEnd = () => {
  props.moveCursor({ x: -1, y: -1 });
};

onMounted(() => {
  document.addEventListener("dragover", handleDocumentDragOver);
  document.addEventListener("dragend", handleDragEnd);
});

onUnmounted(() => {
  document.removeEventListener("dragover", handleDocumentDragOver);
  document.removeEventListener("dragend", handleDragEnd);
});

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

const boardSize = reactive({ width: 0, height: 0 });
const resizeObserver = ref<ResizeObserver>();

onMounted(() => {
  if (boardRef.value) {
    const rect = boardRef.value.getBoundingClientRect();
    boardSize.width = rect.width;
    boardSize.height = rect.height;
    resizeObserver.value = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        boardSize.width = entry.contentRect.width;
        boardSize.height = entry.contentRect.height;
      }
    });
    resizeObserver.value.observe(boardRef.value);
  }
});

onUnmounted(() => {
  resizeObserver.value?.disconnect();
});

const handleCardMoved = (
  oldCardIndex: number,
  newCardIndex: number,
  combinationIndex: number,
) => {
  props.cardDraggingHandler.to(newCardIndex, combinationIndex);
  props.cardDraggingHandler.from(oldCardIndex, combinationIndex);
};
const handleCardRemoved = (cardIndex: number, combinationIndex: number) => {
  props.cardDraggingHandler.from(cardIndex, combinationIndex);
};
const handleCardAdded = (cardIndex: number, combinationIndex: number) => {
  props.cardDraggingHandler.to(cardIndex, combinationIndex);
};

const handleBoardPointerDown = (e: PointerEvent) => {
  zoom.onPointerDown(e, !!draggingCard.value);
};

const handleFit = () => {
  zoom.fitToScreen(boardRef.value, contentRef.value);
};

const contentStyle = computed(() => zoom.transformStyle.value);
</script>
<template>
  <div
    ref="boardRef"
    class="bg-body-bg overflow-hidden flex-1 relative"
    style="touch-action: none;"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @wheel="zoom.onWheel"
    @pointerdown="handleBoardPointerDown"
    @pointermove="zoom.onPointerMove"
    @pointerup="zoom.onPointerUp"
    @touchstart="zoom.onTouchStart"
    @touchmove="zoom.onTouchMove"
    @touchend="zoom.onTouchEnd"
  >
    <div
      ref="contentRef"
      class="px-2 py-4 flex flex-wrap justify-start items-start content-start min-w-full min-h-full will-change-transform transition-transform duration-150"
      :style="contentStyle"
    >
      <Combination
        v-for="(combination, combinationIndex) in gameBoard.combinations"
        :key="combinationIndex"
        :combination="combination"
        :combination-index="combinationIndex"
        :disabled="!player?.canInteractWithCombination[combinationIndex]"
        :highlighted-card-index="
          combinationIndex === highlightedCard?.combinationIndex
            ? highlightedCard.cardIndex
            : undefined
        "
        :dimmed-card-index="opponentDraggedCards.get(combinationIndex)"
        :locked="
          player?.isPlaying &&
          !player?.canInteractWithCombination[combinationIndex]
        "
        @moved="
          (_, oldIndex: number, newIndex: number) =>
            handleCardMoved(oldIndex, newIndex, combinationIndex)
        "
        @added="
          (_, oldIndex: number) => handleCardAdded(oldIndex, combinationIndex)
        "
        @removed="
          (_, newIndex: number) => handleCardRemoved(newIndex, combinationIndex)
        "
      />

      <CreateCombinationDragZone
        v-if="player.canPlaceCardAlone || player.canMoveCardAlone"
        :card-dragging-handler="cardDraggingHandler"
        :player="player"
      />
    </div>

    <OpponentCursor
      v-for="entry in cursorEntries"
      :key="entry.username"
      :cursor="{
        ...entry.cursor,
        x: entry.cursor.x * boardSize.width * zoom.scale.value + zoom.translateX.value,
        y: entry.cursor.y * boardSize.height * zoom.scale.value + zoom.translateY.value,
      }"
      :color-index="entry.index"
    />

    <div class="absolute bottom-3 right-3 flex gap-1.5 z-50 pointer-events-auto">
      <button
        @click.stop="zoom.zoomIn(boardRef)"
        class="size-9 rounded-lg bg-card-bg border border-card-border shadow-md flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
        title="Zoom in"
      >
        <MagnifyingGlassPlusIcon class="size-5" />
      </button>
      <button
        @click.stop="zoom.zoomOut(boardRef)"
        class="size-9 rounded-lg bg-card-bg border border-card-border shadow-md flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
        title="Zoom out"
      >
        <MagnifyingGlassMinusIcon class="size-5" />
      </button>
      <button
        @click.stop="handleFit"
        class="size-9 rounded-lg bg-card-bg border border-card-border shadow-md flex items-center justify-center cursor-pointer hover:bg-separator active:scale-95 transition-all"
        title="Fit to screen"
      >
        <ArrowsPointingOutIcon class="size-5" />
      </button>
    </div>
  </div>
</template>


<script setup lang="ts">
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  CursorPosition,
  RemoteCursor,
} from "@/app/WebSocket/infrastructure/types";
import type { CardDraggingHandler } from "@/logic/cardDragging";

const props = defineProps<{
  highlightedCard?: CardPositionOnBoard;
  player: PlayerDto;
  gameBoard: GameBoardDto;
  cardDraggingHandler: CardDraggingHandler;
  remoteCursors: Map<string, RemoteCursor>;
  moveCursor: (position: CursorPosition) => void;
}>();

const boardRef = ref<HTMLElement | null>(null);
const { draggingCard } = useDraggingCard();

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

  props.moveCursor({
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
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
</script>
<template>
  <div
    ref="boardRef"
    class="px-2 py-4 bg-body-bg flex flex-wrap overflow-auto justify-start items-start content-start flex-1 relative"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
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

    <OpponentCursor
      v-for="entry in cursorEntries"
      :key="entry.username"
      :cursor="{
        ...entry.cursor,
        x: entry.cursor.x * boardSize.width,
        y: entry.cursor.y * boardSize.height,
      }"
      :color-index="entry.index"
    />
  </div>
</template>

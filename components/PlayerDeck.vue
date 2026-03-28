<script setup lang="ts">
import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import { useTileDrag, useTileMetrics } from "@/composables/useTileDrag";

const NUM_ROWS = 3;
const CARD_GAP = 3;

const props = defineProps<{
  gameBoard: GameBoardDto;
  player: PlayerDto;
  cardDraggingHandler: CardDraggingHandler;
  game: GameInfosDto;
  highlightedCardIndex?: number;
  drawAnimation?: { color: import("@/app/Card/domain/dtos/card").CardColor; number: import("@/app/Card/domain/dtos/card").CardNumber } | null;
}>();

const emit = defineEmits<{
  drawCard: [];
  pass: [];
  cancelTurnModifications: [];
  undoLastAction: [];
  endTurn: [];
}>();

const { t } = useI18n();
const { dragState, startDrag } = useTileDrag();
const { tileW, tileH } = useTileMetrics();

type HandCard = CardDto & { initialIndex: number; row: number; x: number };

const cid = (c: { color: string; number: number; duplicata: number }) =>
  `${c.color}-${c.number}-${c.duplicata}`;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const initializeHand = (serverCards: ReadonlyArray<CardDto>): HandCard[] => {
  const indexed = serverCards.map((c, i) => ({ ...c, initialIndex: i }));
  const shuffled = shuffle(indexed);
  const step = tileW.value + CARD_GAP;
  return shuffled.map((card, i) => ({
    ...card,
    row: i % NUM_ROWS,
    x: Math.floor(i / NUM_ROWS) * step,
  }));
};

const handCards = ref<HandCard[]>(initializeHand(props.player.cards));
const hasInitializedWithCards = ref(props.player.cards.length > 0);

const reconcileCards = (serverCards: ReadonlyArray<CardDto>) => {
  const pool = serverCards.map((card, index) => ({
    ...card,
    initialIndex: index,
    matched: false,
  }));

  const kept: HandCard[] = [];
  for (const hc of handCards.value) {
    const match = pool.find(
      (sc) =>
        !sc.matched &&
        sc.color === hc.color &&
        sc.number === hc.number &&
        sc.duplicata === hc.duplicata,
    );
    if (match) {
      match.matched = true;
      kept.push({ ...hc, initialIndex: match.initialIndex });
    }
  }

  const added = pool.filter((sc) => !sc.matched);
  const step = tileW.value + CARD_GAP;
  for (const sc of added) {
    const drop = pendingReturnDrop.value;
    if (drop) {
      kept.push({
        color: sc.color,
        number: sc.number,
        duplicata: sc.duplicata,
        initialIndex: sc.initialIndex,
        row: drop.row,
        x: drop.x,
      });
      pendingReturnDrop.value = null;
    } else {
      const rowCounts = Array.from({ length: NUM_ROWS }, (_, r) =>
        kept.filter((c) => c.row === r).length,
      );
      const targetRow = rowCounts.indexOf(Math.min(...rowCounts));
      const rowCards = kept.filter((c) => c.row === targetRow);
      const maxX =
        rowCards.length > 0
          ? Math.max(...rowCards.map((c) => c.x)) + step
          : 0;

      kept.push({
        color: sc.color,
        number: sc.number,
        duplicata: sc.duplicata,
        initialIndex: sc.initialIndex,
        row: targetRow,
        x: maxX,
      });
    }
  }

  handCards.value = kept;
};

watch(
  () => props.player,
  (player) => {
    if (!hasInitializedWithCards.value && player.cards.length > 0) {
      handCards.value = initializeHand(player.cards);
      hasInitializedWithCards.value = true;
    } else {
      reconcileCards(player.cards);
    }
    nextTick(resolveAllRows);
  },
);

const rowGroups = computed(() => {
  const result: HandCard[][] = Array.from({ length: NUM_ROWS }, () => []);
  for (const card of handCards.value) {
    if (card.row >= 0 && card.row < NUM_ROWS) {
      result[card.row].push(card);
    }
  }
  return result;
});


// --- Hand-internal drag ---

const handDrag = ref<{
  cardId: string;
  offsetX: number;
  boardMode: boolean;
  originalRow?: number;
  originalX?: number;
} | null>(null);

const rowEls = ref<(HTMLElement | null)[]>(Array(NUM_ROWS).fill(null));

const getRowMaxX = (rowIndex: number) => {
  const el = rowEls.value[rowIndex];
  if (!el) return Infinity;
  return el.clientWidth - tileW.value - 8;
};

const handleCardPointerDown = (e: PointerEvent, card: HandCard) => {
  e.preventDefault();
  e.stopPropagation();

  const rowEl = rowEls.value[card.row];
  if (!rowEl) return;

  const rowRect = rowEl.getBoundingClientRect();
  const cardScreenX = rowRect.left - rowEl.scrollLeft + card.x;
  const offsetX = e.clientX - cardScreenX;

  handDrag.value = {
    cardId: cid(card),
    offsetX,
    boardMode: false,
  };
};

const handlePointerMove = (e: PointerEvent) => {
  const drag = handDrag.value;
  if (!drag || drag.boardMode) return;

  const card = handCards.value.find((c) => cid(c) === drag.cardId);
  if (!card) return;

  const deckEl = document.querySelector("[data-player-deck]") as HTMLElement;
  if (deckEl) {
    const deckRect = deckEl.getBoundingClientRect();
    if (e.clientY < deckRect.top - 10 && props.player.canPlaceCard) {
      drag.boardMode = true;
      drag.originalRow = card.row;
      drag.originalX = card.x;
      startDrag(
        { type: "hand", cardIndex: card.initialIndex },
        card.color,
        card.number,
        e.clientX,
        e.clientY,
      );
      return;
    }
  }

  let targetRow = card.row;
  for (let i = 0; i < NUM_ROWS; i++) {
    const el = rowEls.value[i];
    if (el) {
      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetRow = i;
        break;
      }
    }
  }

  const rowEl = rowEls.value[targetRow];
  if (rowEl) {
    const rowRect = rowEl.getBoundingClientRect();
    const newX = e.clientX - rowRect.left + rowEl.scrollLeft - drag.offsetX;
    const maxX = getRowMaxX(targetRow);
    card.x = Math.max(0, Math.min(newX, maxX));
    card.row = targetRow;
  }
};

const pendingReturnDrop = ref<{ row: number; x: number } | null>(null);

const handlePointerUp = () => {
  const drag = handDrag.value;
  if (!drag) return;

  if (!drag.boardMode) {
    const card = handCards.value.find((c) => cid(c) === drag.cardId);
    if (card) {
      resolveOverlaps(card.row);
    }
  } else {
    const card = handCards.value.find((c) => cid(c) === drag.cardId);
    if (card) {
      const drop = pendingReturnDrop.value;
      if (drop) {
        card.row = drop.row;
        card.x = drop.x;
        pendingReturnDrop.value = null;
      } else if (drag.originalRow != null && drag.originalX != null) {
        card.row = drag.originalRow;
        card.x = drag.originalX;
      }
      resolveOverlaps(card.row);
    }
  }
  handDrag.value = null;
};

const resolveAllRows = () => {
  for (let r = 0; r < NUM_ROWS; r++) resolveOverlaps(r);
};

const onResize = () => nextTick(resolveAllRows);

onMounted(() => {
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("resize", onResize);
  nextTick(resolveAllRows);
});

onUnmounted(() => {
  document.removeEventListener("pointermove", handlePointerMove);
  document.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("resize", onResize);
});

const isHandDragging = (card: HandCard) =>
  handDrag.value?.cardId === cid(card) && !handDrag.value?.boardMode;

const isBoardDragging = (card: HandCard) => {
  if (handDrag.value?.cardId === cid(card) && handDrag.value?.boardMode)
    return true;
  return (
    dragState.value.active &&
    dragState.value.source?.type === "hand" &&
    dragState.value.source?.cardIndex === card.initialIndex
  );
};

const phantomReturn = computed<{ row: number; x: number } | null>(() => {
  const ds = dragState.value;
  if (!ds.active) return null;

  for (let i = 0; i < NUM_ROWS; i++) {
    const el = rowEls.value[i];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (ds.pointerY >= rect.top - 8 && ds.pointerY <= rect.bottom + 8) {
      const x = Math.max(0, Math.min(ds.pointerX - rect.left - tileW.value / 2, getRowMaxX(i)));
      return { row: i, x };
    }
  }
  return null;
});

const isHandSourceDrag = computed(() =>
  dragState.value.active && dragState.value.source?.type === "hand",
);

watch(phantomReturn, (val) => {
  if (val) {
    pendingReturnDrop.value = { row: val.row, x: val.x };
  }
});

watch(() => dragState.value.active, (active) => {
  if (!active) {
    setTimeout(() => { pendingReturnDrop.value = null; }, 2000);
  }
});

const pushPositions = computed<Map<string, number>>(() => {
  let activeRow: number | null = null;
  let activeX = 0;
  let excludeId: string | null = null;

  const drag = handDrag.value;
  if (drag && !drag.boardMode) {
    const dragCard = handCards.value.find((c) => cid(c) === drag.cardId);
    if (dragCard) {
      activeRow = dragCard.row;
      activeX = dragCard.x;
      excludeId = drag.cardId;
    }
  } else {
    const phantom = phantomReturn.value;
    if (phantom) {
      activeRow = phantom.row;
      activeX = phantom.x;
      if (drag?.boardMode) {
        excludeId = drag.cardId;
      }
    }
  }

  if (activeRow === null) return new Map();

  const step = tileW.value + CARD_GAP;
  const halfTile = tileW.value / 2;
  const positions = new Map<string, number>();

  const others = handCards.value
    .filter((c) => c.row === activeRow && (excludeId ? cid(c) !== excludeId : true))
    .sort((a, b) => a.x - b.x);

  if (others.length === 0) return positions;

  const dragCenter = activeX + halfTile;
  let insertIdx = others.findIndex((c) => c.x + halfTile >= dragCenter);
  if (insertIdx === -1) insertIdx = others.length;

  let minX = activeX + step;
  for (let i = insertIdx; i < others.length; i++) {
    if (others[i].x < minX) {
      positions.set(cid(others[i]), minX);
      minX += step;
    } else {
      break;
    }
  }

  return positions;
});

const getVisualX = (card: HandCard) => {
  if (isHandDragging(card)) return card.x;
  const pushed = pushPositions.value.get(cid(card));
  return pushed !== undefined ? pushed : card.x;
};

const effectiveStep = () => {
  const normalStep = tileW.value + CARD_GAP;
  let minStep = normalStep;
  for (let r = 0; r < NUM_ROWS; r++) {
    const count = handCards.value.filter((c) => c.row === r).length;
    if (count <= 1) continue;
    const maxX = getRowMaxX(r);
    const available = maxX > 0 ? maxX : normalStep * count;
    const needed = (count - 1) * normalStep;
    if (needed > available) {
      minStep = Math.min(minStep, available / (count - 1));
    }
  }
  return minStep;
};

const resolveOverlaps = (row: number) => {
  const step = effectiveStep();
  const maxX = getRowMaxX(row);
  const rowCards = handCards.value
    .filter((c) => c.row === row)
    .sort((a, b) => a.x - b.x);

  if (rowCards.length === 0) return;

  if (rowCards[0].x < 0) rowCards[0].x = 0;

  for (let i = 1; i < rowCards.length; i++) {
    const minAllowed = rowCards[i - 1].x + step;
    if (rowCards[i].x < minAllowed) {
      rowCards[i].x = minAllowed;
    }
  }

  const last = rowCards[rowCards.length - 1];
  if (last.x > maxX) {
    last.x = Math.max(0, maxX);
    for (let i = rowCards.length - 2; i >= 0; i--) {
      const cap = rowCards[i + 1].x - step;
      if (rowCards[i].x > cap) {
        rowCards[i].x = Math.max(0, cap);
      }
    }
  }
};
</script>
<template>
  <div
    data-player-deck
    class="bg-[#F3F1EC] shadow-[0_-2px_8px_rgba(0,0,0,0.05)] flex flex-col gap-0.5 px-2 pt-1.5 pb-0.5 relative z-10"
    style="padding-bottom: max(0.25rem, env(safe-area-inset-bottom));"
  >
    <GameRuleReminder
      v-if="player.isPlaying && !player.hasStarted"
      :game-rule="'first_turn'"
      dismissible
    >
      {{
        t("rules.first_turn.reminder", {
          playedPoints: gameBoard.turnPoints,
          neededPoints: MIN_POINTS_TO_START,
        })
      }}
    </GameRuleReminder>

    <PlayerActions
      :player="player"
      :game="game"
      @cancel-turn-modifications="emit('cancelTurnModifications')"
      @undo-last-action="emit('undoLastAction')"
      @draw-card="emit('drawCard')"
      @pass="emit('pass')"
      @end-turn="emit('endTurn')"
    />

    <CollapsibleSection>
      <div v-if="player" class="flex flex-col gap-0.5">
        <div
          v-for="(cards, rowIndex) in rowGroups"
          :key="rowIndex"
          :ref="(el: any) => { rowEls[rowIndex] = el }"
          class="hand-row"
        >
          <div
            class="hand-row-content"
            :style="{ height: tileH + 'px' }"
          >
            <div
              v-for="card in cards"
              :key="cid(card)"
              class="hand-card"
              :class="{
                'hand-card-active': isHandDragging(card),
                'hand-card-board': isBoardDragging(card),
              }"
              :style="{ transform: `translateX(${getVisualX(card)}px)` }"
              style="touch-action: none;"
              @pointerdown="(e) => handleCardPointerDown(e, card)"
            >
              <DrawAnimation
                v-if="drawAnimation && highlightedCardIndex === card.initialIndex"
                :color="card.color"
                :number="card.number"
              />
              <Card
                v-else
                :color="card.color"
                :number="card.number"
                :movable="player.isPlaying"
                :highlighted="highlightedCardIndex === card.initialIndex"
              />
            </div>

            <div
              v-if="phantomReturn && !isHandSourceDrag && phantomReturn.row === rowIndex && dragState.color && dragState.number != null"
              class="hand-card phantom-card"
              :style="{ transform: `translateX(${phantomReturn.x}px)` }"
            >
              <Card
                :color="dragState.color"
                :number="dragState.number"
                class="opacity-40"
              />
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  </div>
</template>

<style scoped>
.hand-row {
  border-radius: 0.5rem;
  background: #EAE8E3;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 4px;
  overflow: hidden;
  position: relative;
}

.hand-row-content {
  position: relative;
  width: 100%;
}

.hand-card {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transition: transform 150ms ease, opacity 150ms ease;
}

.hand-card-active {
  z-index: 10;
  transition: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.phantom-card {
  pointer-events: none;
  z-index: 5;
  transition: transform 80ms ease;
}

.hand-card-board {
  opacity: 0.3;
  pointer-events: none;
  transform: scale(0.8) !important;
  transition: transform 120ms ease, opacity 120ms ease;
}
</style>

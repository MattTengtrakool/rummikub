<script setup lang="ts">
import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { OrderedCardDto } from "@/app/Card/domain/gamerules/grouping";
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type { ChangeEvent } from "@/lib/vueDraggable";
import { toKey } from "@/logic/card";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import Draggable from "vuedraggable";

const NUM_ROWS = 3;

type HandSpacer = { _spacer: true; _id: string };
type HandCard = OrderedCardDto & { _spacer?: never };
type HandItem = HandCard | HandSpacer;

const isSpacer = (item: HandItem): item is HandSpacer => '_spacer' in item && item._spacer === true;

let spacerSeq = 0;
const makeSpacer = (): HandSpacer => ({ _spacer: true, _id: `sp${spacerSeq++}` });

const itemKey = (item: HandItem): string =>
  isSpacer(item) ? item._id : toKey(item);

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
  cancelTurnModifications: [];
  undoLastAction: [];
  endTurn: [];
}>();

const { t } = useI18n();
const { startDragging, stopDragging } = useDraggingCard();

const handDragInProgress = ref(false);
const cardAddedToHandRow = ref(false);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const toHandCard = (card: CardDto, initialIndex: number): HandCard =>
  Object.freeze({ color: card.color, number: card.number, duplicata: card.duplicata, initialIndex }) as HandCard;

const addSpacers = (items: HandItem[], count: number) => {
  for (let n = 0; n < count; n++) items.push(makeSpacer());
};

const SPACERS_BETWEEN = 0;
const SPACERS_LEADING = 0;
const SPACERS_TRAILING = 6;
const MIN_TRAILING_SPACERS = 6;

const interleaveWithSpacers = (cards: HandCard[]): HandItem[] => {
  const items: HandItem[] = [];
  addSpacers(items, SPACERS_LEADING);
  for (let i = 0; i < cards.length; i++) {
    items.push(cards[i]);
    if (i < cards.length - 1) {
      addSpacers(items, SPACERS_BETWEEN);
    }
  }
  addSpacers(items, SPACERS_TRAILING);
  return items;
};

const initializeRows = (serverCards: ReadonlyArray<CardDto>): HandItem[][] => {
  const indexed = serverCards.map((c, i) => toHandCard(c, i));
  const shuffled = shuffle(indexed);
  const cardRows: HandCard[][] = Array.from({ length: NUM_ROWS }, () => []);
  shuffled.forEach((card, i) => cardRows[i % NUM_ROWS].push(card));
  return cardRows.map(interleaveWithSpacers);
};

const rows = ref<HandItem[][]>(initializeRows(props.player.cards));
const hasInitializedWithCards = ref(props.player.cards.length > 0);

const reconcileCards = (serverCards: ReadonlyArray<CardDto>) => {
  const pool = serverCards.map((card, index) => ({
    ...card,
    initialIndex: index,
    matched: false,
  }));

  const newRows: HandItem[][] = Array.from({ length: NUM_ROWS }, () => []);

  for (let r = 0; r < NUM_ROWS; r++) {
    for (const item of rows.value[r]) {
      if (isSpacer(item)) {
        newRows[r].push(item);
        continue;
      }
      const match = pool.find(
        (sc) =>
          !sc.matched &&
          sc.color === item.color &&
          sc.number === item.number &&
          sc.duplicata === item.duplicata,
      );
      if (match) {
        match.matched = true;
        newRows[r].push(toHandCard(match, match.initialIndex));
      } else {
        newRows[r].push(makeSpacer());
      }
    }
  }

  const added = pool.filter((sc) => !sc.matched);
  for (const sc of added) {
    const target = newRows.reduce((best, row, idx) => {
      const spacerCount = row.filter(isSpacer).length;
      const bestCount = newRows[best].filter(isSpacer).length;
      return spacerCount > bestCount ? idx : best;
    }, 0);

    const firstTrailingSpacerIdx = findFirstTrailingSpacer(newRows[target]);
    if (firstTrailingSpacerIdx !== -1) {
      newRows[target][firstTrailingSpacerIdx] = toHandCard(sc, sc.initialIndex);
    } else {
      newRows[target].push(toHandCard(sc, sc.initialIndex));
    }
  }

  rows.value = newRows;
  ensureTrailingSpacers();
};

const ensureTrailingSpacers = () => {
  for (const row of rows.value) {
    let trailingCount = 0;
    for (let i = row.length - 1; i >= 0; i--) {
      if (isSpacer(row[i])) trailingCount++;
      else break;
    }
    const needed = MIN_TRAILING_SPACERS - trailingCount;
    for (let n = 0; n < needed; n++) {
      row.push(makeSpacer());
    }
  }
};

const findLastIndex = <T,>(arr: T[], predicate: (item: T) => boolean): number => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
};

const findFirstTrailingSpacer = (row: HandItem[]): number => {
  let lastCardIdx = -1;
  for (let i = row.length - 1; i >= 0; i--) {
    if (!isSpacer(row[i])) {
      lastCardIdx = i;
      break;
    }
  }
  const candidate = lastCardIdx + 1;
  return candidate < row.length && isSpacer(row[candidate]) ? candidate : -1;
};

watch(
  () => props.player,
  (player) => {
    if (!hasInitializedWithCards.value && player.cards.length > 0) {
      rows.value = initializeRows(player.cards);
      hasInitializedWithCards.value = true;
    } else {
      reconcileCards(player.cards);
    }
  },
);

const handleChange = (e: ChangeEvent<HandItem>) => {
  if (e.added && !isSpacer(e.added.element)) {
    if (handDragInProgress.value) {
      cardAddedToHandRow.value = true;
    } else {
      props.cardDraggingHandler.toHand();
    }
  }
  if (e.removed && !isSpacer(e.removed.element)) {
    if (cardAddedToHandRow.value) {
      cardAddedToHandRow.value = false;
    } else {
      props.cardDraggingHandler.from((e.removed.element as HandCard).initialIndex, null);
    }
  }
  ensureTrailingSpacers();
};

const handleDragStart = (e: { oldIndex: number }, rowIndex: number) => {
  handDragInProgress.value = true;
  const item = rows.value[rowIndex][e.oldIndex];
  if (item && !isSpacer(item)) startDragging(item);
};

const handleDragEnd = () => {
  handDragInProgress.value = false;
  cardAddedToHandRow.value = false;
  stopDragging();
};

</script>
<template>
  <div class="bg-body-bg border-t flex flex-col gap-3 px-2 py-3">
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
      @end-turn="emit('endTurn')"
    />

    <div v-if="player" class="flex flex-col gap-0.5">
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        class="hand-row"
      >
        <Draggable
          v-model="rows[rowIndex]"
          :group="{
            name: 'combinations',
            pull: true,
            put: true,
          }"
          tag="div"
          class="hand-row-inner"
          :item-key="itemKey"
          :sort="true"
          filter=".hand-spacer"
          :preventOnFilter="false"
          :delay="150"
          :delayOnTouchOnly="true"
          @change="handleChange"
          @start="(e: any) => handleDragStart(e, rowIndex)"
          @end="handleDragEnd"
        >
          <template #item="{ element }">
            <div
              v-if="isSpacer(element)"
              class="hand-spacer"
            />
            <DrawAnimation
              v-else-if="drawAnimation && highlightedCardIndex === element.initialIndex"
              :color="element.color"
              :number="element.number"
            />
            <Card
              v-else
              :color="element.color"
              :number="element.number"
              :movable="true"
              :highlighted="highlightedCardIndex === element.initialIndex"
            />
          </template>
        </Draggable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hand-row {
  min-height: 3rem;
  border-radius: 0.375rem;
  background: #EBEBEB;
  padding: 0.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}

@media (min-width: 768px) {
  .hand-row {
    min-height: 4rem;
  }
}

.hand-row-inner {
  display: inline-flex;
  align-items: start;
  gap: 2px;
  min-width: 100%;
  min-height: inherit;
}

.hand-row-inner > * {
  scroll-snap-align: start;
}

.hand-spacer {
  width: 0.75rem;
  height: 3rem;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .hand-spacer {
    width: 1.25rem;
    height: 4rem;
  }
}
</style>

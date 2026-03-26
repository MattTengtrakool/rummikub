<script setup lang="ts">
import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { OrderedCardDto } from "@/app/Card/domain/gamerules/grouping";
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { useOrderedCards } from "@/composables/useOrderedCards";
import type { ChangeEvent } from "@/lib/vueDraggable";
import { toKey } from "@/logic/card";
import type { CardDraggingHandler } from "@/logic/cardDragging";
import Draggable from "vuedraggable";

const props = defineProps<{
  gameBoard: GameBoardDto;
  player: PlayerDto;
  cardDraggingHandler: CardDraggingHandler;
  game: GameInfosDto;
  highlightedCardIndex?: number;
}>();

const emit = defineEmits<{
  drawCard: [];
  cancelTurnModifications: [];
  endTurn: [];
}>();

const { t } = useI18n();
const orderedCards = useOrderedCards();

const cards = ref<Array<OrderedCardDto>>(
  orderedCards.toOrdered([...props.player.cards]),
);

const reconcileCards = (serverCards: ReadonlyArray<CardDto>) => {
  const pool = serverCards.map((card, index) => ({
    ...card,
    initialIndex: index,
    matched: false,
  }));

  const kept: OrderedCardDto[] = [];
  for (const local of cards.value) {
    const match = pool.find(
      (sc) =>
        !sc.matched &&
        sc.color === local.color &&
        sc.number === local.number &&
        sc.duplicata === local.duplicata,
    );
    if (match) {
      match.matched = true;
      kept.push(
        Object.freeze({ color: match.color, number: match.number, duplicata: match.duplicata, initialIndex: match.initialIndex }),
      );
    }
  }

  const added = pool
    .filter((sc) => !sc.matched)
    .map((sc) =>
      Object.freeze({ color: sc.color, number: sc.number, duplicata: sc.duplicata, initialIndex: sc.initialIndex }),
    );

  cards.value = [...kept, ...added];
};

watch(
  () => props.player,
  (player) => {
    reconcileCards(player.cards);
  },
);

watch(
  () => orderedCards.isOrderedByColor.value,
  () => {
    cards.value = orderedCards.toOrdered([...props.player.cards]);
  },
);

const handleChange = (e: ChangeEvent<OrderedCardDto>) => {
  if (e.added) {
    props.cardDraggingHandler.toHand();
  }
  if (e.removed) {
    props.cardDraggingHandler.from(e.removed.element.initialIndex, null);
  }
};
</script>
<template>
  <div class="bg-body-bg border-t flex flex-col gap-2 px-2 py-4">
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
      :is-ordered-by-color="orderedCards.isOrderedByColor.value"
      :is-ordered-by-number="orderedCards.isOrderedByNumber.value"
      :game="game"
      @cancel-turn-modifications="emit('cancelTurnModifications')"
      @draw-card="emit('drawCard')"
      @end-turn="emit('endTurn')"
      @order-by-color="orderedCards.orderByColor()"
      @order-by-number="orderedCards.orderByNumber()"
    />

    <div v-if="player" class="flex justify-start items-start flex-wrap gap-3">
      <Draggable
        v-model="cards"
        :group="{
          name: 'combinations',
          pull: player.isPlaying,
          put: player.isPlaying,
        }"
        tag="div"
        class="justify-start items-start flex-wrap gap-0.5 inline-flex"
        :item-key="(card: CardDto) => toKey(card)"
        :sort="true"
        @change="handleChange"
      >
        <template #item="{ element: card }: { element: OrderedCardDto }">
          <Card
            :color="card.color"
            :number="card.number"
            :movable="player.isPlaying"
            :highlighted="highlightedCardIndex === card.initialIndex"
          />
        </template>
      </Draggable>
    </div>
  </div>
</template>

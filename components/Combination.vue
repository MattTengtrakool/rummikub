<script setup lang="ts">
import type { CardDto } from "@/app/Card/domain/dtos/card";
import type { CombinationDto } from "@/app/Combination/domain/dtos/combination";
import type { ChangeEvent } from "@/lib/vueDraggable";
import { toKey } from "@/logic/card";
import { ref, watch } from "vue";
import Draggable from "vuedraggable";

const props = defineProps<{
  highlightedCardIndex?: number;
  dimmedCardIndex?: number;
  disabled?: boolean;
  locked?: boolean;
  combination: CombinationDto;
  combinationIndex: number;
}>();

const emit = defineEmits<{
  removed: [card: CardDto, newIndex: number];
  added: [card: CardDto, oldIndex: number];
  moved: [card: CardDto, oldIndex: number, newIndex: number];
}>();

const { startDragging, stopDragging } = useDraggingCard();

const cards = ref([...props.combination.cards]);

watch(
  () => props.combination,
  (combination) => {
    cards.value = [...combination.cards];
  },
);

const handleChange = (e: ChangeEvent<CardDto>) => {
  if (e.moved) {
    return emit("moved", e.moved.element, e.moved.oldIndex, e.moved.newIndex);
  }
  if (e.added) {
    return emit("added", e.added.element, e.added.newIndex);
  }
  if (e.removed) {
    return emit("removed", e.removed.element, e.removed.oldIndex);
  }
};

const handleDragStart = (e: { oldIndex: number }) => {
  const card = cards.value[e.oldIndex];
  startDragging({
    color: card.color,
    number: card.number,
    sourcePosition: {
      combinationIndex: props.combinationIndex,
      cardIndex: e.oldIndex,
    },
  });
};
</script>
<template>
  <div
    class="w-min flex flex-col items-center gap-1 p-2 px-4 rounded-lg transition-all duration-300 hover:bg-black/[0.02]"
    :class="[combination.type === 'invalid' && 'combination-invalid']"
  >
    <Draggable
      :disabled="disabled"
      v-model="cards"
      group="combinations"
      tag="div"
      class="justify-start items-start gap-0.5 inline-flex p-2 -m-2"
      :item-key="(card: CardDto) => toKey(card)"
      :delay="150"
      :delayOnTouchOnly="true"
      :animation="80"
      ghost-class="drag-ghost"
      drag-class="drag-active"
      @change="handleChange"
      @start="handleDragStart"
      @end="stopDragging"
    >
      <template #item="{ element: card, index }">
        <Card
          :highlighted="index === highlightedCardIndex"
          :dimmed="index === dimmedCardIndex"
          :movable="!disabled"
          :locked="locked"
          :color="card.color"
          :number="card.number"
        />
      </template>
    </Draggable>
  </div>
</template>

<style scoped>
.combination-invalid :deep(.inline-flex > div) {
  border-color: rgba(239, 68, 68, 0.45);
}

:deep(.drag-ghost) {
  opacity: 0.4;
  border: 2px dashed #b0aea8;
  background: transparent;
  border-radius: 0.375rem;
  box-shadow: none;
}

:deep(.drag-active) {
  opacity: 1 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 50;
}
</style>

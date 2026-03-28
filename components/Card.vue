<script setup lang="ts">
import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";
import { isJokerNumber } from "@/app/Card/domain/gamerules/isJoker";
import BlackJokerSymbol from "@/assets/card/joker/black.svg?component";
import RedJokerSymbol from "@/assets/card/joker/red.svg?component";
import BlackCardSymbol from "@/assets/card/symbol/black.svg?component";
import BlueCardSymbol from "@/assets/card/symbol/blue.svg?component";
import RedCardSymbol from "@/assets/card/symbol/red.svg?component";
import YellowCardSymbol from "@/assets/card/symbol/yellow.svg?component";
import { LockClosedIcon } from "@heroicons/vue/16/solid";
import { useTileMetrics } from "@/composables/useTileDrag";

const props = defineProps<{
  movable?: boolean;
  locked?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  animate?: boolean;
  number: CardNumber;
  color: CardColor;
}>();

const { t } = useI18n();
const { draggingCard } = useDraggingCard();
const { tileW, tileH } = useTileMetrics();

const cardStyle = computed(() => ({
  width: `${tileW.value}px`,
  height: `${tileH.value}px`,
}));

const isLarge = computed(() => tileH.value >= 60);

watchEffect(() => {
  if (typeof document === 'undefined') return;
  document.documentElement.style.cursor = draggingCard.value ? 'grabbing' : '';
});

const dragHintOpen = ref(false);
let hintTimer: ReturnType<typeof setTimeout> | null = null;

function showHint() {
  dragHintOpen.value = true;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { dragHintOpen.value = false; }, 1800);
}
</script>
<template>
  <div
    @click="showHint"
    @mousedown="dragHintOpen = false"
    :style="cardStyle"
    class="border border-card-border border-t-white/80 relative select-none bg-card-bg rounded-md shadow-sm flex-col justify-center items-center gap-1 inline-flex transition-all duration-200"
    :class="[movable && !draggingCard && 'cursor-grab', movable && !draggingCard && 'hover:-translate-y-0.5 hover:shadow-md', dimmed && 'opacity-25 border-dashed shadow-none', animate && 'card-enter', highlighted && 'card-highlight']"
  >
    <template v-if="isJokerNumber(number)">
      <BlackJokerSymbol
        v-if="color === 'black'"
        :class="isLarge ? 'size-6' : 'size-4'"
        class="mb-1"
      />
      <RedJokerSymbol
        v-if="color === 'red'"
        :class="isLarge ? 'size-6' : 'size-4'"
        class="mb-1"
      />
    </template>
    <span
      v-else
      class="font-black font-sans"
      :class="[
        isLarge ? 'text-xl' : 'text-sm',
        {
          'text-card-text-red': color === 'red',
          'text-card-text-blue': color === 'blue',
          'text-card-text-yellow': color === 'yellow',
          'text-card-text-black': color === 'black',
        },
      ]"
    >
      {{ number }}
    </span>

    <template v-if="!isJokerNumber(number)">
      <RedCardSymbol :class="isLarge ? 'size-3' : 'size-2'" v-if="color === 'red'" />
      <BlueCardSymbol :class="isLarge ? 'size-3' : 'size-2'" v-if="color === 'blue'" />
      <YellowCardSymbol :class="isLarge ? 'size-3' : 'size-2'" v-if="color === 'yellow'" />
      <BlackCardSymbol :class="isLarge ? 'size-3' : 'size-2'" v-if="color === 'black'" />
    </template>

    <div
      v-if="locked"
      class="absolute inset-0 bg-card-bg-overlay-locked/70 text-card-text-overlay-locked flex items-center justify-center"
    >
      <LockClosedIcon :class="isLarge ? 'size-6' : 'size-4'" />
    </div>

    <Transition name="drag-hint">
      <div
        v-if="dragHintOpen"
        class="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-gray-800/90 text-white text-[10px] font-medium shadow-lg pointer-events-none backdrop-blur-sm z-50"
      >
        {{ t("components.card.drag_hint") }}
        <div class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-800/90 rotate-45 rounded-[1px]" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.card-enter {
  animation: card-pop-in 150ms ease-out;
}

@keyframes card-pop-in {
  from { transform: scale(0.85); opacity: 0.5; }
  to { transform: scale(1); opacity: 1; }
}

.drag-hint-enter-active {
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.drag-hint-leave-active {
  transition: opacity 200ms ease-in, transform 200ms ease-in;
}
.drag-hint-enter-from {
  opacity: 0;
  transform: translate(-50%, 4px);
}
.drag-hint-leave-to {
  opacity: 0;
  transform: translate(-50%, 2px);
}

.card-highlight {
  animation: highlight-glow 1.8s ease-out forwards;
  z-index: 10;
}

@keyframes highlight-glow {
  0% {
    box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.45);
  }
  60% {
    box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.25);
  }
  100% {
    box-shadow: none;
  }
}
</style>

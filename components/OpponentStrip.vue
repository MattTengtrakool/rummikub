<script setup lang="ts">
import type { OpponentDto } from "@/app/WebSocket/infrastructure/types";

const PLAYER_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b",
  "#a855f7", "#ec4899", "#14b8a6", "#f97316",
];

const props = defineProps<{
  opponents: OpponentDto[];
  reconnectingPlayers?: Map<string, number>;
}>();

const MAX_VISIBLE_TILES = 14;
</script>
<template>
  <div class="flex flex-nowrap gap-3 px-4 py-1.5 overflow-x-auto border-t border-separator/30">
    <div
      v-for="(opponent, i) in opponents"
      :key="opponent.username"
      class="flex items-center gap-2 shrink-0 px-2 py-1"
    >
      <div class="flex items-center gap-1.5">
        <span
          class="size-2 rounded-full shrink-0"
          :class="[reconnectingPlayers?.has(opponent.username) && 'animate-pulse']"
          :style="{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }"
        />
        <span class="text-xs font-medium whitespace-nowrap">
          {{ opponent.username }}
        </span>
        <span v-if="reconnectingPlayers?.has(opponent.username)" class="text-[9px] text-yellow-600 whitespace-nowrap">
          reconnecting...
        </span>
      </div>

      <div class="flex items-center gap-px">
        <div
          v-for="n in Math.min(opponent.cardCount, MAX_VISIBLE_TILES)"
          :key="n"
          class="w-3 h-4 md:w-4 md:h-5 rounded-sm bg-gray-400/80 border border-gray-500/40"
        />
        <span class="text-[10px] text-body-text-disabled ml-1">
          {{ opponent.cardCount }}
        </span>
      </div>
    </div>
  </div>
</template>

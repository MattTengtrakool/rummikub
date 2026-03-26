<script setup lang="ts">
import type { OpponentDto } from "@/app/WebSocket/infrastructure/types";

defineProps<{
  opponents: OpponentDto[];
}>();

const MAX_VISIBLE_TILES = 14;
</script>
<template>
  <div class="flex flex-wrap gap-3 px-4 py-2 border-b bg-body-bg">
    <div
      v-for="opponent in opponents"
      :key="opponent.username"
      class="flex items-center gap-2"
    >
      <div class="flex items-center gap-1.5">
        <span
          class="size-2 rounded-full shrink-0"
          :class="opponent.isPlaying ? 'bg-button-text-success animate-pulse' : 'bg-gray-300'"
        />
        <span class="text-xs font-medium whitespace-nowrap">
          {{ opponent.username }}
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

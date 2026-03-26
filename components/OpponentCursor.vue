<script setup lang="ts">
import type { RemoteCursor } from "@/app/WebSocket/infrastructure/types";

const CURSOR_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const props = defineProps<{
  cursor: RemoteCursor;
  colorIndex: number;
}>();

const color = computed(
  () => CURSOR_COLORS[props.colorIndex % CURSOR_COLORS.length],
);
</script>
<template>
  <div
    class="absolute pointer-events-none z-50"
    :style="{
      left: `${cursor.x}px`,
      top: `${cursor.y}px`,
      transition: 'left 150ms cubic-bezier(0.2, 0, 0, 1), top 150ms cubic-bezier(0.2, 0, 0, 1)',
    }"
  >
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1L6.5 18L9 10.5L15.5 8L1 1Z"
        :fill="color"
        stroke="white"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>

    <div class="absolute left-3 top-5 flex flex-col items-start gap-1">
      <div
        v-if="cursor.draggingCard"
        class="transition-all duration-200 ease-out"
        :style="{
          transform: 'scale(1.15) rotate(-3deg)',
          filter: `drop-shadow(0 4px 8px ${color}40)`,
        }"
      >
        <Card
          :color="cursor.draggingCard.color"
          :number="cursor.draggingCard.number"
          class="shadow-xl"
          :style="{ outline: `2px solid ${color}`, outlineOffset: '1px', borderRadius: '4px' }"
        />
      </div>
      <span
        class="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm"
        :style="{ backgroundColor: color }"
      >
        {{ cursor.username }}
      </span>
    </div>
  </div>
</template>

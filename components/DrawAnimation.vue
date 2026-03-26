<script setup lang="ts">
import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";

defineProps<{
  color: CardColor;
  number: CardNumber;
}>();
</script>
<template>
  <div class="draw-reveal pointer-events-none">
    <Card :color="color" :number="number" />
  </div>
</template>
<style scoped>
.draw-reveal {
  animation: card-reveal 500ms ease-out forwards;
  filter: drop-shadow(0 0 8px rgba(63, 132, 21, 0.6));
}

@keyframes card-reveal {
  0% {
    transform: scale(0.6);
    opacity: 0;
    filter: drop-shadow(0 0 12px rgba(63, 132, 21, 0.8));
  }
  40% {
    transform: scale(1.15);
    opacity: 1;
    filter: drop-shadow(0 0 10px rgba(63, 132, 21, 0.6));
  }
  70% {
    transform: scale(0.97);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    filter: drop-shadow(0 0 0 transparent);
  }
}
</style>

<script setup lang="ts">
import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";

defineProps<{
  color: CardColor;
  number: CardNumber;
}>();
</script>
<template>
  <div class="draw-perspective pointer-events-none">
    <div class="draw-slide">
      <div class="draw-flip">
        <div class="card-face card-front">
          <Card :color="color" :number="number" />
        </div>
        <div class="card-face card-back">
          <div class="card-back-tile" />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.draw-perspective {
  perspective: 600px;
}

.draw-slide {
  animation: slide-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.draw-flip {
  position: relative;
  transform-style: preserve-3d;
  animation: flip-reveal 700ms ease-in-out forwards;
}

.card-face {
  backface-visibility: hidden;
}

.card-front {
  transform: rotateY(180deg);
}

.card-back {
  position: absolute;
  top: 0;
  left: 0;
}

.card-back-tile {
  width: 2.5rem;
  height: 3rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(107, 114, 128, 0.4);
  background: rgba(156, 163, 175, 0.8);
}

@media (min-width: 768px) {
  .card-back-tile {
    width: 3rem;
    height: 4rem;
  }
}

@keyframes slide-in {
  0% {
    transform: translateX(-100px) translateY(-8px);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  50% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(0) translateY(0);
  }
}

@keyframes flip-reveal {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(0deg);
  }
  92% {
    transform: rotateY(180deg) scale(1.05);
  }
  100% {
    transform: rotateY(180deg) scale(1);
  }
}
</style>

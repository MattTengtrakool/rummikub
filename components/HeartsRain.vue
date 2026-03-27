<script setup lang="ts">
const hearts = Array.from({ length: 60 }, (_, i) => {
  const size = 16 + (i % 6) * 5;
  const left = ((i * 17 + 5) % 100);
  const delay = ((i * 3) % 35) / 10;
  const duration = 4 + ((i * 11) % 30) / 10;
  const swayAmount = 20 + (i % 6) * 15;
  const swayDir = i % 2 === 0 ? 1 : -1;
  const startRotation = (i * 29) % 40 - 20;
  const opacity = 0.5 + (i % 5) * 0.1;

  return {
    style: {
      left: `${left}%`,
      fontSize: `${size}px`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      transform: `rotate(${startRotation}deg)`,
      "--sway": `${swayAmount * swayDir}px`,
      "--peak-opacity": `${opacity}`,
    } as Record<string, string | number>,
  };
});

const visible = ref(true);
onMounted(() => {
  setTimeout(() => { visible.value = false; }, 12000);
});
</script>
<template>
  <Teleport to="body">
    <div v-if="visible" class="hearts-rain" aria-hidden="true">
      <span
        v-for="(heart, i) in hearts"
        :key="i"
        class="heart-piece"
        :style="heart.style"
      >&#x2764;&#xFE0F;</span>
    </div>
  </Teleport>
</template>
<style>
.hearts-rain {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 200;
}

.hearts-rain .heart-piece {
  position: absolute;
  top: -40px;
  opacity: 0;
  animation: hearts-fall linear forwards;
  filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.35));
}

@keyframes hearts-fall {
  0% {
    opacity: 0;
    transform: translateY(-5vh) translateX(0) scale(0.4);
  }
  5% {
    opacity: var(--peak-opacity, 0.7);
    transform: translateY(0) translateX(0) scale(0.8);
  }
  20% {
    opacity: var(--peak-opacity, 0.7);
    transform: translateY(15vh) translateX(var(--sway)) scale(1);
  }
  40% {
    opacity: var(--peak-opacity, 0.7);
    transform: translateY(35vh) translateX(calc(var(--sway) * -0.5)) scale(1);
  }
  60% {
    opacity: calc(var(--peak-opacity, 0.7) * 0.85);
    transform: translateY(55vh) translateX(calc(var(--sway) * 0.7)) scale(0.95);
  }
  80% {
    opacity: calc(var(--peak-opacity, 0.7) * 0.5);
    transform: translateY(78vh) translateX(calc(var(--sway) * -0.3)) scale(0.85);
  }
  95% {
    opacity: calc(var(--peak-opacity, 0.7) * 0.15);
    transform: translateY(98vh) translateX(calc(var(--sway) * 0.1)) scale(0.7);
  }
  100% {
    opacity: 0;
    transform: translateY(105vh) translateX(0) scale(0.6);
  }
}
</style>

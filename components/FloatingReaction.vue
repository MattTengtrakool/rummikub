<script setup lang="ts">
import type { ReactionType } from "@/app/WebSocket/infrastructure/types";

const props = defineProps<{
  reaction: ReactionType;
  username: string;
}>();

const EMOJI_MAP: Record<ReactionType, string> = {
  "thumbs-up": "\u{1F44D}",
  "clap": "\u{1F44F}",
  "thinking": "\u{1F914}",
  "laugh": "\u{1F602}",
  "fire": "\u{1F525}",
  "cry": "\u{1F622}",
};

const emoji = computed(() => EMOJI_MAP[props.reaction] ?? "");

const randomX = Math.random() * 60 + 20;
</script>
<template>
  <div
    class="floating-reaction pointer-events-none fixed z-50"
    :style="{ left: randomX + '%' }"
  >
    <div class="flex flex-col items-center">
      <span class="text-3xl">{{ emoji }}</span>
      <span class="text-[10px] font-medium text-body-text bg-card-bg/80 rounded px-1">{{ username }}</span>
    </div>
  </div>
</template>
<style scoped>
.floating-reaction {
  bottom: 30%;
  animation: float-up 2.5s ease-out forwards;
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  70% {
    opacity: 0.8;
    transform: translateY(-120px) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateY(-200px) scale(0.8);
  }
}
</style>

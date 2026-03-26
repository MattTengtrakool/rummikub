<script setup lang="ts">
import type { ReactionType } from "@/app/WebSocket/infrastructure/types";
import { FaceSmileIcon } from "@heroicons/vue/20/solid";

const emit = defineEmits<{
  react: [reaction: ReactionType];
}>();

const open = ref(false);

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: "thumbs-up", emoji: "\u{1F44D}" },
  { type: "clap", emoji: "\u{1F44F}" },
  { type: "thinking", emoji: "\u{1F914}" },
  { type: "laugh", emoji: "\u{1F602}" },
  { type: "fire", emoji: "\u{1F525}" },
  { type: "cry", emoji: "\u{1F622}" },
];

let lastReactionTime = 0;
const THROTTLE_MS = 2000;

function handleReact(type: ReactionType) {
  const now = Date.now();
  if (now - lastReactionTime < THROTTLE_MS) return;
  lastReactionTime = now;
  emit("react", type);
  open.value = false;
}
</script>
<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="text-body-text-disabled hover:text-body-text transition-colors p-0.5"
      title="Reactions"
    >
      <FaceSmileIcon class="size-4" />
    </button>

    <Transition name="picker-pop">
      <div
        v-if="open"
        class="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-card-bg border border-card-border rounded-full px-2 py-1 shadow-lg"
      >
        <button
          v-for="r in REACTIONS"
          :key="r.type"
          @click="handleReact(r.type)"
          class="text-base hover:scale-125 active:scale-95 transition-transform"
          :title="r.type"
        >
          {{ r.emoji }}
        </button>
      </div>
    </Transition>
  </div>
</template>
<style scoped>
.picker-pop-enter-active {
  transition: all 150ms ease-out;
}
.picker-pop-leave-active {
  transition: all 100ms ease-in;
}
.picker-pop-enter-from,
.picker-pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(4px);
}
</style>

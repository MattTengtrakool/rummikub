<template>
  <UModal :ui="{ background: 'bg-body-bg' }">
    <div class="relative overflow-hidden">
      <!-- Win screen (normal or stalemate with winner) -->
      <template v-if="winnerUsername">
        <div class="confetti-container" aria-hidden="true">
          <span v-for="i in 40" :key="i" class="confetti-piece" :style="confettiStyle(i)" />
        </div>

        <div class="relative z-10 flex flex-col items-center text-center px-8 pt-10 pb-8 gap-6">
          <div class="relative">
            <div class="absolute -inset-4 rounded-full bg-amber-100/60 blur-xl" />
            <div class="relative group">
              <img
                src="/images/first-place.png"
                class="size-28 drop-shadow-lg"
                height="512"
                width="512"
              />
              <a
                class="hidden absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-body-text-disabled group-hover:block whitespace-nowrap"
                href="https://www.flaticon.com/free-stickers/prize"
                title="prize stickers"
              >Created by Stickers</a>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium tracking-wide uppercase text-body-text-disabled">
              {{ endReason === "stalemate"
                ? t("pages.game.ended.stalemate_subtitle")
                : t("pages.game.ended.title")
              }}
            </p>
            <h2 class="text-3xl font-bold tracking-tight">
              {{ isCurrentUser
                ? t("pages.game.ended.you_won")
                : t("pages.game.ended.winner", { username: winnerUsername })
              }}
            </h2>
            <p v-if="endReason === 'stalemate'" class="text-sm text-body-text-disabled">
              {{ t("pages.game.ended.stalemate_explanation") }}
            </p>
          </div>

          <Button href="/" type="filled" class="mt-2 min-w-[160px]">
            {{ t("pages.game.ended.back_home") }}
          </Button>
        </div>
      </template>

      <!-- Forfeit screen -->
      <template v-else>
        <div class="flex flex-col items-center text-center px-8 pt-10 pb-8 gap-6">
          <div class="size-16 rounded-full bg-separator flex items-center justify-center">
            <ArrowRightStartOnRectangleIcon class="size-8 text-body-text-disabled" />
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium tracking-wide uppercase text-body-text-disabled">
              {{ t("pages.game.ended.title") }}
            </p>
            <h2 class="text-2xl font-bold tracking-tight">
              {{ t("pages.game.ended.player_left") }}
            </h2>
          </div>

          <Button href="/" type="filled" class="mt-2 min-w-[160px]">
            {{ t("pages.game.ended.back_home") }}
          </Button>
        </div>
      </template>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { GameEndReason } from "@/app/Game/application/Game";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  winnerUsername?: string;
  selfUsername?: string;
  endReason?: GameEndReason;
}>();

const { t } = useI18n();

const isCurrentUser = computed(
  () => props.selfUsername && props.winnerUsername === props.selfUsername,
);

const confettiColors = [
  "#f43f5e", "#3b82f6", "#eab308", "#10b981",
  "#8b5cf6", "#f97316", "#06b6d4", "#ec4899",
];

function confettiStyle(i: number) {
  const left = ((i * 17 + 3) % 100);
  const delay = ((i * 7) % 30) / 10;
  const duration = 2.5 + ((i * 3) % 15) / 10;
  const size = 4 + (i % 4) * 2;
  const color = confettiColors[i % confettiColors.length];
  const rotation = (i * 47) % 360;
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    transform: `rotate(${rotation}deg)`,
  };
}
</script>

<style scoped>
.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  top: -10px;
  border-radius: 2px;
  opacity: 0;
  animation: confetti-fall linear forwards;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(320px) rotate(720deg) scale(0.4);
  }
}
</style>

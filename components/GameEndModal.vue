<template>
  <!-- Full-screen confetti (winner only) -->
  <Teleport to="body">
    <div v-if="isCurrentUser" class="confetti-fullscreen" aria-hidden="true">
      <span
        v-for="i in 150"
        :key="i"
        class="confetti-piece"
        :class="confettiShapeClass(i)"
        :style="confettiStyle(i)"
      />
    </div>
  </Teleport>

  <UModal v-bind="$attrs" :ui="{ background: 'bg-body-bg' }">
    <div class="relative overflow-hidden">
      <!-- Winner screen -->
      <template v-if="isCurrentUser">
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
            <h2 class="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {{ t("pages.game.ended.you_won") }}
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

      <!-- Loser screen -->
      <template v-else-if="winnerUsername">
        <div class="flex flex-col items-center text-center px-8 pt-10 pb-8 gap-6">
          <div class="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FaceFrownIcon class="size-10 text-gray-400 dark:text-gray-500" />
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium tracking-wide uppercase text-body-text-disabled">
              {{ endReason === "stalemate"
                ? t("pages.game.ended.stalemate_subtitle")
                : t("pages.game.ended.title")
              }}
            </p>
            <h2 class="text-2xl font-bold tracking-tight">
              {{ t("pages.game.ended.you_lost") }}
            </h2>
            <p class="text-sm text-body-text-disabled">
              {{ endReason === "stalemate"
                ? t("pages.game.ended.stalemate_explanation")
                : t("pages.game.ended.winner", { username: winnerUsername })
              }}
            </p>
            <p class="text-sm text-body-text-disabled">
              {{ t("pages.game.ended.better_luck") }}
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
import { FaceFrownIcon } from "@heroicons/vue/24/outline";

defineOptions({ inheritAttrs: false });

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
  "#facc15", "#fb923c", "#a78bfa", "#34d399",
];

const shapes = ["rect", "circle", "strip"] as const;

function confettiShapeClass(i: number) {
  return `confetti-${shapes[i % shapes.length]}`;
}

function confettiStyle(i: number) {
  const left = ((i * 17 + 3) % 100);
  const color = confettiColors[i % confettiColors.length];
  const rotation = (i * 47) % 360;
  const swayDistance = 40 + (i % 5) * 20;
  const swayDir = i % 2 === 0 ? 1 : -1;
  const delay = ((i * 3) % 40) / 10;
  const duration = 3 + ((i * 7) % 25) / 10;
  const size = 6 + (i % 6) * 3;
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size * (shapes[i % shapes.length] === "strip" ? 3 : 1)}px`,
    backgroundColor: color,
    transform: `rotate(${rotation}deg)`,
    "--sway": `${swayDistance * swayDir}px`,
  };
}
</script>

<style scoped>
.confetti-piece {
  position: absolute;
  top: -10px;
  opacity: 0;
}

.confetti-rect {
  border-radius: 2px;
}

.confetti-circle {
  border-radius: 50%;
}

.confetti-strip {
  border-radius: 1px;
}
</style>

<style>
.confetti-fullscreen {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 200;
}

.confetti-fullscreen .confetti-piece {
  position: absolute;
  top: -20px;
  opacity: 0;
  animation: confetti-fall-screen linear forwards;
}

@keyframes confetti-fall-screen {
  0% {
    opacity: 1;
    transform: translateY(0) translateX(0) rotate(0deg) scale(1);
  }
  25% {
    transform: translateY(25vh) translateX(var(--sway, 30px)) rotate(270deg) scale(1);
  }
  50% {
    transform: translateY(50vh) translateX(calc(var(--sway, 30px) * -0.5)) rotate(540deg) scale(0.9);
  }
  75% {
    opacity: 1;
    transform: translateY(75vh) translateX(var(--sway, 30px)) rotate(810deg) scale(0.7);
  }
  100% {
    opacity: 0;
    transform: translateY(105vh) translateX(0) rotate(1080deg) scale(0.3);
  }
}
</style>

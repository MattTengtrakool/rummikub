<script setup lang="ts">
import { ClockIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  remaining: number | null;
  expired: boolean;
  strict: boolean;
}>();

const { t } = useI18n();

const isWarning = computed(() =>
  props.remaining !== null && props.remaining <= 10 && props.remaining > 0
);

const formattedTime = computed(() => {
  if (props.remaining === null) return "";
  const minutes = Math.floor(props.remaining / 60);
  const seconds = props.remaining % 60;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  return `${seconds}s`;
});
</script>
<template>
  <div
    class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold shadow-sm transition-all tabular-nums"
    :class="{
      'bg-red-100 text-red-600 animate-pulse shadow-red-200/50': expired,
      'bg-amber-100 text-amber-600 shadow-amber-200/50': isWarning && !expired,
      'bg-separator text-body-text': !isWarning && !expired,
    }"
  >
    <ClockIcon class="size-3.5" />
    <span v-if="expired">{{ t("pages.game.timer.times_up") }}</span>
    <span v-else>{{ formattedTime }}</span>
  </div>
</template>

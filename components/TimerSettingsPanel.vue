<script setup lang="ts">
import type { TimerSettings } from "@/app/Game/application/Game";
import { ClockIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  timerSettings: TimerSettings;
}>();

const emit = defineEmits<{
  update: [settings: TimerSettings];
}>();

const { t } = useI18n();

const durationOptions = [30, 60, 90, 120];

const toggle = () => {
  emit("update", {
    ...props.timerSettings,
    enabled: !props.timerSettings.enabled,
  });
};

const setDuration = (seconds: number) => {
  emit("update", {
    ...props.timerSettings,
    durationSeconds: seconds,
  });
};

const setStrict = (strict: boolean) => {
  emit("update", {
    ...props.timerSettings,
    strict,
  });
};
</script>
<template>
  <div class="flex flex-col items-center gap-3 w-full max-w-xs">
    <button
      @click="toggle"
      class="flex items-center gap-2 text-sm font-medium transition-colors"
      :class="timerSettings.enabled ? 'text-body-text' : 'text-body-text-disabled'"
    >
      <ClockIcon class="size-4" />
      {{ t("pages.game.timer.label") }}
      <span
        class="inline-flex items-center justify-center h-5 px-2 rounded-full text-xs font-bold transition-colors"
        :class="timerSettings.enabled ? 'bg-body-text text-white' : 'bg-separator text-body-text-disabled'"
      >
        {{ timerSettings.enabled ? "ON" : "OFF" }}
      </span>
    </button>

    <template v-if="timerSettings.enabled">
      <div class="flex flex-col items-center gap-2">
        <span class="text-xs text-body-text-disabled">{{ t("pages.game.timer.duration") }}</span>
        <div class="flex gap-1.5">
          <button
            v-for="seconds in durationOptions"
            :key="seconds"
            @click="setDuration(seconds)"
            class="h-8 px-3 rounded-lg text-xs font-bold transition-colors"
            :class="timerSettings.durationSeconds === seconds
              ? 'bg-body-text text-white'
              : 'bg-button-bg text-body-text hover:bg-separator'"
          >
            {{ t("pages.game.timer.seconds", { n: seconds }) }}
          </button>
        </div>
      </div>

      <div class="flex flex-col items-center gap-2">
        <span class="text-xs text-body-text-disabled">{{ t("pages.game.timer.mode") }}</span>
        <div class="flex gap-1.5">
          <button
            @click="setStrict(false)"
            class="h-8 px-3 rounded-lg text-xs font-bold transition-colors"
            :class="!timerSettings.strict
              ? 'bg-body-text text-white'
              : 'bg-button-bg text-body-text hover:bg-separator'"
          >
            {{ t("pages.game.timer.relaxed") }}
          </button>
          <button
            @click="setStrict(true)"
            class="h-8 px-3 rounded-lg text-xs font-bold transition-colors"
            :class="timerSettings.strict
              ? 'bg-body-text text-white'
              : 'bg-button-bg text-body-text hover:bg-separator'"
          >
            {{ t("pages.game.timer.strict") }}
          </button>
        </div>
        <span class="text-xs text-body-text-disabled">
          {{ timerSettings.strict ? t("pages.game.timer.strict_description") : t("pages.game.timer.relaxed_description") }}
        </span>
      </div>
    </template>
  </div>
</template>

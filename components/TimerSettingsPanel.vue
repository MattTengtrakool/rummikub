<script setup lang="ts">
import type { TimerSettings } from "@/app/Game/application/Game";

const props = defineProps<{
  timerSettings: TimerSettings;
}>();

const emit = defineEmits<{
  update: [settings: TimerSettings];
}>();

const { t } = useI18n();

const durationOptions = [30, 45, 60, 75, 90, 120];

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
  <div class="flex flex-col gap-3 w-full max-w-xs">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("pages.game.timer.label") }}</span>
      <button
        @click="toggle"
        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        :class="timerSettings.enabled ? 'bg-body-text' : 'bg-separator'"
      >
        <span
          class="inline-block size-3.5 transform rounded-full bg-white transition-transform"
          :class="timerSettings.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'"
        />
      </button>
    </div>

    <template v-if="timerSettings.enabled">
      <div class="flex items-center gap-3">
        <span class="text-xs text-body-text-disabled w-14">{{ t("pages.game.timer.duration") }}</span>
        <div class="flex gap-1.5 flex-1">
          <button
            v-for="seconds in durationOptions"
            :key="seconds"
            @click="setDuration(seconds)"
            class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
            :class="timerSettings.durationSeconds === seconds
              ? 'bg-body-text text-white'
              : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
          >
            {{ t("pages.game.timer.seconds", { n: seconds }) }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-xs text-body-text-disabled w-14">{{ t("pages.game.timer.mode") }}</span>
        <div class="flex gap-1.5 flex-1">
          <button
            @click="setStrict(false)"
            class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
            :class="!timerSettings.strict
              ? 'bg-body-text text-white'
              : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
          >
            {{ t("pages.game.timer.relaxed") }}
          </button>
          <button
            @click="setStrict(true)"
            class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
            :class="timerSettings.strict
              ? 'bg-body-text text-white'
              : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
          >
            {{ t("pages.game.timer.strict") }}
          </button>
        </div>
      </div>
      <p class="text-xs text-body-text-disabled text-center">
        {{ timerSettings.strict ? t("pages.game.timer.strict_description") : t("pages.game.timer.relaxed_description") }}
      </p>
    </template>
  </div>
</template>

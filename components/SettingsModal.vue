<template>
  <UModal :ui="{ background: 'bg-body-bg', width: 'sm:max-w-sm' }">
    <div class="p-6 flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Cog6ToothIcon class="size-5 text-body-text-disabled" />
          </div>
          <h2 class="text-lg font-bold">{{ t("pages.settings.title") }}</h2>
        </div>
        <button
          @click="modal.close()"
          class="size-8 rounded-lg flex items-center justify-center hover:bg-black/[0.04] transition-colors"
        >
          <XMarkIcon class="size-4 text-body-text-disabled" />
        </button>
      </div>

      <!-- Profile -->
      <div class="flex flex-col gap-3">
        <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">
          {{ t("pages.settings.profile") }}
        </span>
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2">
          <label class="text-xs font-medium text-body-text/60">{{ t("pages.settings.username") }}</label>
          <input
            v-model="localUsername"
            @blur="commitUsername"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            maxlength="20"
            :placeholder="t('pages.settings.username_placeholder')"
            class="w-full text-sm bg-white border border-separator rounded-lg px-3 py-2 outline-none focus:border-body-text/30 transition-colors"
          />
        </div>
      </div>

      <!-- Audio -->
      <div class="flex flex-col gap-3">
        <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">
          {{ t("pages.settings.audio") }}
        </span>
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <button
              @click="toggleMute"
              class="size-8 rounded-lg flex items-center justify-center hover:bg-black/[0.04] transition-colors shrink-0"
              :title="muted ? t('pages.settings.muted') : t('pages.settings.unmuted')"
            >
              <SpeakerXMarkIcon v-if="muted" class="size-4 text-body-text-disabled" />
              <SpeakerWaveIcon v-else class="size-4 text-body-text" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="volume"
              @input="onVolumeInput"
              @change="previewSound"
              class="volume-slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              :class="muted ? 'opacity-40' : ''"
            />
            <span class="text-xs font-medium text-body-text-disabled tabular-nums w-8 text-right">
              {{ Math.round(volume * 100) }}
            </span>
          </div>
          <p class="text-xs text-body-text-disabled">
            {{ muted ? t("pages.settings.muted") : t("pages.settings.unmuted") }}
          </p>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { Cog6ToothIcon, XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/vue/20/solid";
import { useSettings } from "@/composables/useSettings";
import { useSound } from "@/composables/useSound";

const modal = useModal();
const { t } = useI18n();
const { volume, muted, toggleMute } = useSettings();
const { username } = useUsername();
const { play } = useSound();

const localUsername = ref(username.value ?? "");

watch(username, (v) => { localUsername.value = v ?? ""; });

function commitUsername() {
  const trimmed = localUsername.value.trim();
  if (trimmed.length > 0) {
    username.value = trimmed;
  } else {
    localUsername.value = username.value ?? "";
  }
}

function onVolumeInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  volume.value = val;
  if (muted.value && val > 0) muted.value = false;
}

function previewSound() {
  play("button-click", 0.8);
}
</script>

<style scoped>
.volume-slider {
  background: linear-gradient(to right, #a8a29e, #a8a29e) no-repeat;
  background-size: calc(v-bind(volume) * 100%) 100%;
  background-color: #e7e5e4;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #44403c;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #44403c;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
</style>

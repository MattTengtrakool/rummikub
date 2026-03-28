<template>
  <UModal :ui="{ background: 'bg-body-bg', width: 'sm:max-w-sm' }">
    <div class="p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
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

        <!-- SFX -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2">
          <span class="text-[11px] font-medium text-body-text/50 uppercase tracking-wider">{{ t("pages.settings.sfx") }}</span>
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
              :style="{ '--slider-fill': volume }"
              :class="muted ? 'opacity-40' : ''"
            />
            <span class="text-xs font-medium text-body-text-disabled tabular-nums w-8 text-right">
              {{ Math.round(volume * 100) }}
            </span>
          </div>
        </div>

        <!-- Music -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2">
          <span class="text-[11px] font-medium text-body-text/50 uppercase tracking-wider">{{ t("pages.settings.music") }}</span>
          <div class="flex items-center gap-3">
            <button
              @click="toggleMusicMute"
              class="size-8 rounded-lg flex items-center justify-center hover:bg-black/[0.04] transition-colors shrink-0"
              :title="musicMuted ? t('pages.settings.music_off') : t('pages.settings.music_on')"
            >
              <MusicalNoteIcon v-if="!musicMuted" class="size-4 text-body-text" />
              <MusicalNoteIcon v-else class="size-4 text-body-text-disabled line-through" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="musicVolume"
              @input="onMusicVolumeInput"
              class="volume-slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              :style="{ '--slider-fill': musicVolume }"
              :class="musicMuted ? 'opacity-40' : ''"
            />
            <span class="text-xs font-medium text-body-text-disabled tabular-nums w-8 text-right">
              {{ Math.round(musicVolume * 100) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Visual -->
      <div class="flex flex-col gap-3">
        <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">
          {{ t("pages.settings.visual") }}
        </span>

        <!-- Board theme -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2">
          <span class="text-[11px] font-medium text-body-text/50 uppercase tracking-wider">{{ t("pages.settings.board_theme") }}</span>
          <div class="flex gap-2">
            <button
              v-for="theme in BOARD_THEMES"
              :key="theme.value"
              @click="boardTheme = theme.value"
              class="flex-1 rounded-lg border px-2.5 py-2 flex flex-col items-center gap-1.5 transition-all text-[11px] font-medium"
              :class="boardTheme === theme.value
                ? 'border-body-text/30 bg-black/[0.03] text-body-text'
                : 'border-separator hover:border-body-text/15 text-body-text-disabled'"
            >
              <div
                class="size-8 rounded-md border border-black/10"
                :style="{ backgroundColor: theme.preview }"
              />
              {{ t(theme.label) }}
            </button>
          </div>
        </div>

        <!-- Card size -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2">
          <span class="text-[11px] font-medium text-body-text/50 uppercase tracking-wider">{{ t("pages.settings.card_size") }}</span>
          <div class="flex gap-1.5">
            <button
              v-for="size in CARD_SIZES"
              :key="size.value"
              @click="cardSize = size.value"
              class="flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all"
              :class="cardSize === size.value
                ? 'border-body-text/30 bg-black/[0.03] text-body-text'
                : 'border-separator hover:border-body-text/15 text-body-text-disabled'"
            >
              {{ t(size.label) }}
            </button>
          </div>
        </div>

        <!-- Opponent cursors -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <CursorArrowRaysIcon class="size-4 text-body-text/60 shrink-0" />
            <span class="text-xs font-medium text-body-text/80">{{ t("pages.settings.show_cursors") }}</span>
          </div>
          <button
            @click="showCursors = !showCursors"
            class="relative w-9 h-5 rounded-full transition-colors"
            :class="showCursors ? 'bg-emerald-500' : 'bg-gray-300'"
          >
            <div
              class="absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
              :class="showCursors ? 'translate-x-4' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Reduce animations -->
        <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <EyeSlashIcon v-if="reduceAnimations" class="size-4 text-body-text/60 shrink-0" />
            <EyeIcon v-else class="size-4 text-body-text/60 shrink-0" />
            <span class="text-xs font-medium text-body-text/80">{{ t("pages.settings.reduce_animations") }}</span>
          </div>
          <button
            @click="reduceAnimations = !reduceAnimations"
            class="relative w-9 h-5 rounded-full transition-colors"
            :class="reduceAnimations ? 'bg-emerald-500' : 'bg-gray-300'"
          >
            <div
              class="absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
              :class="reduceAnimations ? 'translate-x-4' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { Cog6ToothIcon, XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon, MusicalNoteIcon, EyeIcon, EyeSlashIcon, CursorArrowRaysIcon } from "@heroicons/vue/20/solid";
import { useSettings, type BoardTheme, type CardSize } from "@/composables/useSettings";
import { useSound } from "@/composables/useSound";

const modal = useModal();
const { t } = useI18n();
const {
  volume, muted, toggleMute,
  musicVolume, musicMuted, toggleMusicMute,
  boardTheme, cardSize, showCursors, reduceAnimations,
} = useSettings();

const BOARD_THEMES: { value: BoardTheme; label: string; preview: string }[] = [
  { value: "light", label: "pages.settings.theme_light", preview: "#F0EDE6" },
  { value: "dark", label: "pages.settings.theme_dark", preview: "#2C2A27" },
  { value: "green", label: "pages.settings.theme_green", preview: "#2D5A3D" },
];

const CARD_SIZES: { value: CardSize; label: string }[] = [
  { value: "small", label: "pages.settings.card_small" },
  { value: "normal", label: "pages.settings.card_normal" },
  { value: "large", label: "pages.settings.card_large" },
];
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

function onMusicVolumeInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  musicVolume.value = val;
  if (musicMuted.value && val > 0) musicMuted.value = false;
}
</script>

<style scoped>
.volume-slider {
  background: linear-gradient(to right, #a8a29e, #a8a29e) no-repeat;
  background-size: calc(var(--slider-fill) * 100%) 100%;
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

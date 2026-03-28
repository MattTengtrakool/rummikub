<script setup lang="ts">
import type { AIDifficulty } from "@/app/AI/domain/types";
import { CpuChipIcon } from "@heroicons/vue/20/solid";

const { t } = useI18n();
const modal = useModal();

const difficulties: { id: AIDifficulty; label: string; description: string; color: string }[] = [
  { id: "easy", label: "Easy", description: "Plays simple combinations. Good for learning.", color: "text-green-600" },
  { id: "medium", label: "Medium", description: "Extends board combinations. A fair challenge.", color: "text-yellow-600" },
  { id: "hard", label: "Hard", description: "Rearranges the board. Expert-level opponent.", color: "text-red-600" },
];

const selectedDifficulty = ref<AIDifficulty>("medium");
const timerEnabled = ref(false);
const timerDuration = ref(60);
const timerStrict = ref(false);

function startAIGame() {
  const params = new URLSearchParams();
  params.set("difficulty", selectedDifficulty.value);
  if (timerEnabled.value) {
    params.set("timerEnabled", "true");
    params.set("timerDuration", String(timerDuration.value));
    if (timerStrict.value) params.set("timerStrict", "true");
  }
  modal.close();
  window.location.href = `/games/create-ai?${params.toString()}`;
}
</script>
<template>
  <UModal :ui="{ background: 'bg-body-bg' }">
  <div class="p-6 flex flex-col gap-5">
    <div class="flex flex-col items-center gap-2">
      <div class="size-10 rounded-full bg-gray-100 flex items-center justify-center">
        <CpuChipIcon class="size-5 text-body-text-disabled" />
      </div>
      <h2 class="text-lg font-bold">Play vs AI</h2>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">Difficulty</span>
      <div class="flex flex-col gap-1.5">
        <button
          v-for="d in difficulties"
          :key="d.id"
          @click="selectedDifficulty = d.id"
          class="flex items-start gap-3 p-3 rounded-xl border transition-all text-left"
          :class="selectedDifficulty === d.id
            ? 'border-body-text bg-black/[0.03] shadow-sm'
            : 'border-separator hover:border-body-text-disabled'"
        >
          <div
            class="size-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors"
            :class="selectedDifficulty === d.id ? 'border-body-text' : 'border-separator'"
          >
            <div
              v-if="selectedDifficulty === d.id"
              class="size-2 rounded-full bg-body-text"
            />
          </div>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-sm font-semibold" :class="d.color">{{ d.label }}</span>
            <span class="text-xs text-body-text-disabled">{{ d.description }}</span>
          </div>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">Turn timer</span>
        <button
          @click="timerEnabled = !timerEnabled"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          :class="timerEnabled ? 'bg-body-text' : 'bg-separator'"
        >
          <span
            class="inline-block size-3.5 transform rounded-full bg-white transition-transform"
            :class="timerEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'"
          />
        </button>
      </div>

      <template v-if="timerEnabled">
        <div class="flex items-center gap-3">
          <span class="text-xs text-body-text-disabled w-14">Duration</span>
          <div class="flex gap-1.5 flex-1">
            <button
              v-for="sec in [30, 60, 90, 120]"
              :key="sec"
              @click="timerDuration = sec"
              class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
              :class="timerDuration === sec
                ? 'bg-body-text text-white'
                : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
            >
              {{ sec }}s
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-body-text-disabled w-14">Mode</span>
          <div class="flex gap-1.5 flex-1">
            <button
              @click="timerStrict = false"
              class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
              :class="!timerStrict
                ? 'bg-body-text text-white'
                : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
            >
              Relaxed
            </button>
            <button
              @click="timerStrict = true"
              class="flex-1 h-7 rounded-md text-xs font-medium transition-colors"
              :class="timerStrict
                ? 'bg-body-text text-white'
                : 'bg-black/[0.04] text-body-text hover:bg-black/[0.08]'"
            >
              Strict
            </button>
          </div>
        </div>
      </template>
    </div>

    <Button type="filled" class="w-full" @click="startAIGame">
      Start game
    </Button>
  </div>
  </UModal>
</template>

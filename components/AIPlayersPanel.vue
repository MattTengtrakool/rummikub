<script setup lang="ts">
import type { AIDifficulty } from "@/app/AI/domain/types";
import type { OpponentDto } from "@/app/WebSocket/infrastructure/types";
import { CpuChipIcon, PlusIcon, TrashIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  aiOpponents: OpponentDto[];
  canAdd: boolean;
}>();

const emit = defineEmits<{
  add: [difficulty: AIDifficulty];
  remove: [playerId: string];
}>();

const { t } = useI18n();

const difficulties: AIDifficulty[] = ["easy", "medium", "hard"];

const AI_DIFFICULTY_COLORS: Record<AIDifficulty, string> = {
  easy: "text-green-700 bg-green-50 border-green-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  hard: "text-red-700 bg-red-50 border-red-200",
};

const pickerOpen = ref(false);

const handleAdd = (difficulty: AIDifficulty) => {
  emit("add", difficulty);
  pickerOpen.value = false;
};
</script>
<template>
  <div class="flex flex-col gap-2 w-full max-w-xs">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">
        {{ t("pages.game.ai.label") }}
      </span>
    </div>

    <ul v-if="aiOpponents.length > 0" class="flex flex-col gap-1.5">
      <li
        v-for="ai in aiOpponents"
        :key="ai.id"
        class="flex items-center gap-2 rounded-lg border border-separator px-2.5 py-2 bg-white/60"
      >
        <CpuChipIcon class="size-4 text-body-text-disabled shrink-0" />
        <span class="text-sm font-medium truncate">{{ ai.username }}</span>
        <span
          v-if="ai.aiDifficulty"
          class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
          :class="AI_DIFFICULTY_COLORS[ai.aiDifficulty]"
        >
          {{ t(`pages.game.ai.difficulty.${ai.aiDifficulty}`) }}
        </span>
        <button
          type="button"
          class="ml-auto flex items-center justify-center size-7 rounded-md text-body-text-disabled hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          :aria-label="t('pages.game.ai.remove')"
          @click="emit('remove', ai.id)"
        >
          <TrashIcon class="size-4" />
        </button>
      </li>
    </ul>

    <div v-if="!pickerOpen">
      <button
        type="button"
        class="flex items-center justify-center gap-1.5 w-full h-9 rounded-lg border border-dashed border-separator text-xs font-medium text-body-text transition-colors hover:bg-black/[0.03] hover:border-body-text-disabled disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canAdd"
        @click="pickerOpen = true"
      >
        <PlusIcon class="size-4" />
        <span>{{ t("pages.game.ai.add") }}</span>
      </button>
      <p v-if="!canAdd" class="mt-1 text-[10px] text-body-text-disabled text-center">
        {{ t("pages.game.ai.max_reached") }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <span class="text-[10px] text-body-text-disabled text-center">
        {{ t("pages.game.ai.choose_difficulty") }}
      </span>
      <div class="flex gap-1.5">
        <button
          v-for="d in difficulties"
          :key="d"
          type="button"
          class="flex-1 h-8 rounded-md text-xs font-semibold border transition-colors"
          :class="AI_DIFFICULTY_COLORS[d]"
          @click="handleAdd(d)"
        >
          {{ t(`pages.game.ai.difficulty.${d}`) }}
        </button>
      </div>
      <button
        type="button"
        class="text-[11px] text-body-text-disabled hover:text-body-text transition-colors"
        @click="pickerOpen = false"
      >
        {{ t("pages.game.ai.cancel") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { PlusIcon, ForwardIcon, ArrowUturnLeftIcon, XMarkIcon, CheckIcon } from "@heroicons/vue/16/solid";

const props = defineProps<{
  player: PlayerDto;
  game: GameInfosDto;
}>();

const emit = defineEmits<{
  drawCard: [];
  pass: [];
  cancelTurnModifications: [];
  undoLastAction: [];
  endTurn: [];
}>();

const { t } = useI18n();
</script>
<template>
  <div v-if="player" class="flex flex-wrap items-center gap-2 md:gap-2.5">
    <Button type="secondary" v-if="player.canUndoLastAction" @click="emit('undoLastAction')" class="min-h-[44px] min-w-[44px]">
      <template #prefix><ArrowUturnLeftIcon class="size-3.5" /></template>
      {{ t("undo") }}
    </Button>

    <Button
      type="secondary"
      v-if="player.canCancelTurnModifications"
      @click="emit('cancelTurnModifications')"
      class="min-h-[44px] min-w-[44px]"
    >
      <template #prefix><XMarkIcon class="size-3.5" /></template>
      {{ t("cancel") }}
    </Button>

    <Button type="primary" v-if="player.canDrawCard" @click="emit('drawCard')" class="min-h-[44px] min-w-[44px]">
      <template #prefix><PlusIcon class="size-3.5" /></template>
      {{ t("draw") }}
    </Button>

    <Button type="primary" v-if="player.canPass" @click="emit('pass')" class="min-h-[44px] min-w-[44px]">
      <template #prefix><ForwardIcon class="size-3.5" /></template>
      {{ t("pass") }}
    </Button>

    <Button type="success" v-if="player.canEndTurn" @click="emit('endTurn')" class="min-h-[44px] min-w-[44px]">
      <template #prefix><CheckIcon class="size-3.5" /></template>
      {{ t("end_turn") }}
    </Button>
  </div>
</template>
<i18n lang="yaml">
en:
  draw: Draw
  pass: Pass
  undo: Undo
  cancel: Cancel
  end_turn: End turn
</i18n>

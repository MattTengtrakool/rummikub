<script setup lang="ts">
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";

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
  <div v-if="player" class="flex flex-wrap gap-2 md:gap-3">
    <Button type="primary" v-if="player.canDrawCard" @click="emit('drawCard')" class="min-h-[44px] min-w-[44px]">
      {{ t("draw") }}
    </Button>

    <Button type="primary" v-if="player.canPass" @click="emit('pass')" class="min-h-[44px] min-w-[44px]">
      {{ t("pass") }}
    </Button>

    <Button
      type="primary"
      v-if="player.canUndoLastAction"
      @click="emit('undoLastAction')"
      class="min-h-[44px] min-w-[44px]"
    >
      {{ t("undo") }}
    </Button>

    <Button
      type="primary"
      v-if="player.canCancelTurnModifications"
      @click="emit('cancelTurnModifications')"
      class="min-h-[44px] min-w-[44px]"
    >
      {{ t("cancel") }}
    </Button>

    <Button type="primary" v-if="player.canEndTurn" @click="emit('endTurn')" class="min-h-[44px] min-w-[44px]">
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

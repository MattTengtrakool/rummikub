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
  <div v-if="player" class="flex flex-wrap gap-3">
    <Button type="primary" v-if="player.canDrawCard" @click="emit('drawCard')">
      {{ t("draw") }}
    </Button>

    <Button type="primary" v-if="player.canPass" @click="emit('pass')">
      {{ t("pass") }}
    </Button>

    <Button
      type="primary"
      v-if="player.canUndoLastAction"
      @click="emit('undoLastAction')"
    >
      {{ t("undo") }}
    </Button>

    <Button
      type="primary"
      v-if="player.canCancelTurnModifications"
      @click="emit('cancelTurnModifications')"
    >
      {{ t("cancel") }}
    </Button>

    <Button type="primary" v-if="player.canEndTurn" @click="emit('endTurn')">
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

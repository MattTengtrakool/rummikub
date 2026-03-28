<script setup lang="ts">
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import { MIN_POINTS_TO_START } from "@/app/Player/domain/constants/player";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { PlusIcon, ForwardIcon, ArrowUturnLeftIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon } from "@heroicons/vue/16/solid";

const props = defineProps<{
  player: PlayerDto;
  game: GameInfosDto;
  gameBoard: GameBoardDto;
}>();

const emit = defineEmits<{
  drawCard: [];
  pass: [];
  cancelTurnModifications: [];
  undoLastAction: [];
  endTurn: [];
}>();

const { t } = useI18n();

const endTurnBlockReason = computed(() => {
  if (!props.player.isPlaying || props.player.canEndTurn || props.player.hasDrawnThisTurn) return null;
  if (!props.gameBoard.hasModifications) return null;

  if (!props.gameBoard.isValid) return t("hint_board_invalid");
  if (!props.player.hasStarted && props.gameBoard.turnPoints < MIN_POINTS_TO_START) {
    return t("hint_need_start_points", { points: MIN_POINTS_TO_START });
  }
  if (props.gameBoard.turnPoints <= 0) return t("hint_no_new_points");
  return null;
});
</script>
<template>
  <div v-if="player" class="flex flex-wrap items-center gap-1.5">
    <button
      v-if="player.canUndoLastAction"
      @click="emit('undoLastAction')"
      class="action-pill action-secondary"
    >
      <ArrowUturnLeftIcon class="size-3" />
      {{ t("undo") }}
    </button>

    <button
      v-if="player.canCancelTurnModifications"
      @click="emit('cancelTurnModifications')"
      class="action-pill action-secondary"
    >
      <XMarkIcon class="size-3" />
      {{ t("cancel") }}
    </button>

    <button
      v-if="player.canDrawCard"
      @click="emit('drawCard')"
      class="action-pill action-primary"
    >
      <PlusIcon class="size-3" />
      {{ t("draw") }}
    </button>

    <button
      v-if="player.canPass"
      @click="emit('pass')"
      class="action-pill action-primary"
    >
      <ForwardIcon class="size-3" />
      {{ t("pass") }}
    </button>

    <button
      v-if="player.canEndTurn"
      @click="emit('endTurn')"
      class="action-pill action-success"
    >
      <CheckIcon class="size-3" />
      {{ t("end_turn") }}
    </button>

    <span v-if="endTurnBlockReason" class="end-turn-hint">
      <ExclamationTriangleIcon class="size-3 shrink-0" />
      {{ endTurnBlockReason }}
    </span>
  </div>
</template>
<style scoped>
.action-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 120ms ease;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
}

.action-pill:active {
  transform: scale(0.96);
}

.action-secondary {
  color: #78716c;
}
.action-secondary:hover {
  background: #f5f5f4;
}

.action-primary {
  color: #292524;
}
.action-primary:hover {
  background: #f5f5f4;
}

.action-success {
  color: #16a34a;
  border-color: rgba(22, 163, 74, 0.2);
}
.action-success:hover {
  background: #f0fdf4;
}

.end-turn-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #b45309;
  font-weight: 500;
}
</style>

<i18n lang="yaml">
en:
  draw: Draw
  pass: Pass
  undo: Undo
  cancel: Cancel
  end_turn: End turn
  hint_board_invalid: Board has invalid groups
  hint_need_start_points: "First meld needs {points}+ points"
  hint_no_new_points: No new points on the board
</i18n>

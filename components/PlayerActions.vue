<script setup lang="ts">
import type { GameInfosDto } from "@/app/Game/application/Game";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import { computed } from "vue";

const props = defineProps<{
  player: PlayerDto;
  isOrderedByNumber: boolean;
  isOrderedByColor: boolean;
  game: GameInfosDto;
}>();

const emit = defineEmits<{
  orderByColor: [];
  orderByNumber: [];
  drawCard: [];
  pass: [];
  cancelTurnModifications: [];
  endTurn: [];
}>();

const { t } = useI18n();

const canChangeCardOrder = computed(() => props.game.state === "started");
</script>
<template>
  <div v-if="player" class="flex flex-wrap gap-3">
    <div v-if="canChangeCardOrder" class="flex items-center gap-1.5">
      <span class="text-xs text-body-text-disabled">{{ t("sort") }}:</span>
      <Button
        :type="isOrderedByColor ? 'filled' : 'primary'"
        @click="emit('orderByColor')"
      >
        {{ t("by_color") }}
      </Button>
      <Button
        :type="isOrderedByNumber ? 'filled' : 'primary'"
        @click="emit('orderByNumber')"
      >
        {{ t("by_number") }}
      </Button>
    </div>

    <Button type="primary" v-if="player.canDrawCard" @click="emit('drawCard')">
      {{ t("draw") }}
    </Button>

    <Button type="primary" v-if="player.canPass" @click="emit('pass')">
      {{ t("pass") }}
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
  sort: Sort
  by_color: Color
  by_number: Number
  draw: Draw
  pass: Pass
  cancel: Cancel
  end_turn: End turn
</i18n>

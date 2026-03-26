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
    <Button
      type="primary"
      v-if="canChangeCardOrder && isOrderedByNumber"
      @click="emit('orderByColor')"
    >
      {{ t("by_color") }}
    </Button>

    <Button
      type="primary"
      v-if="canChangeCardOrder && isOrderedByColor"
      @click="emit('orderByNumber')"
    >
      {{ t("by_number") }}
    </Button>

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
  by_color: By color
  by_number: By number
  draw: Draw
  pass: Pass
  cancel: Cancel
  end_turn: End turn
</i18n>

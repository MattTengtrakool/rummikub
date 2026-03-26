<template>
  <div
    class="h-dvh flex flex-col items-center justify-center bg-body-bg text-body-text px-4"
    v-if="game.disconnected.value"
  >
    <div class="flex flex-col items-center text-center gap-3">
      <div class="size-12 rounded-full bg-separator flex items-center justify-center mb-1">
        <ExclamationTriangleIcon class="size-6 text-body-text-disabled" />
      </div>
      <h1 class="text-xl font-bold">{{ t("pages.game.unable_to_connect.title") }}</h1>
      <p class="text-sm text-body-text-disabled">{{ t("pages.game.unable_to_connect.explanation") }}</p>
      <Button href="/" type="filled" class="mt-2">
        {{ t("pages.game.unable_to_connect.back_home") }}
      </Button>
    </div>
  </div>

  <main
    class="h-dvh flex flex-col bg-body-bg text-body-text"
    v-else-if="
      game &&
      game.gameBoard.value &&
      game.selfPlayer.value &&
      game.gameInfos.value &&
      game.connectedUsernames.value
    "
  >
    <nav class="flex gap-2 p-4 border-b border-separator items-center justify-between">
      <span v-if="game.gameInfos.value.state === 'created'" class="text-sm font-medium">
        {{ t("pages.game.invite_code") }}
      </span>
      <template v-if="game.gameInfos.value.state === 'started'">
        <span v-if="game.selfPlayer.value.isPlaying" class="text-sm font-bold">
          {{ t("pages.game.your_turn") }}
        </span>
        <span v-else class="text-sm text-body-text-disabled">
          {{ t("pages.game.turn_of", { username: game.gameInfos.value.currentPlayerUsername }) }}
        </span>
      </template>

      <div class="flex gap-2">
        <Button @click="modal.open(GameRulesModal)">
          <div class="flex gap-2">
            <BookOpenIcon class="size-4 text-body-text" />
          </div>
        </Button>

        <ConnectedUsernames
          v-if="game.connectedUsernames.value"
          :usernames="game.connectedUsernames.value"
        />
      </div>
    </nav>

    <div v-if="game.gameInfos.value.state === 'created'" class="grow flex flex-col items-center justify-center text-center gap-6 p-4">
      <div class="flex flex-col items-center gap-3">
        <p class="text-sm text-body-text-disabled">{{ t("pages.game.invite_friends") }}</p>
        <div class="flex items-center gap-3">
          <span
            v-for="(digit, i) in String(params.id).split('')"
            :key="i"
            class="size-12 rounded-lg bg-white border border-separator flex items-center justify-center text-2xl font-bold"
          >
            {{ digit }}
          </span>
        </div>
        <button
          @click="copyCode"
          class="flex items-center gap-1.5 text-xs text-body-text-disabled hover:text-body-text transition-colors mt-1"
        >
          <CheckIcon v-if="codeCopied" class="size-3.5 text-button-text-success" />
          <ClipboardDocumentIcon v-else class="size-3.5" />
          {{ codeCopied ? t("pages.game.copied") : String(params.id) }}
        </button>
      </div>

      <div class="flex flex-col items-center gap-4">
        <p v-if="game.selfPlayer.value?.admin && !game.selfPlayer.value?.canStartGame" class="text-sm text-body-text-disabled">
          {{ t("pages.game.waiting_for_players", { n: game.gameInfos.value.playersCount }) }}
        </p>
        <p v-if="!game.selfPlayer.value?.admin" class="text-sm text-body-text-disabled">
          {{ t("pages.game.waiting_for_host") }}
        </p>
        <Button
          type="filled"
          v-if="game.selfPlayer.value?.canStartGame"
          @click="game.startGame()"
        >
          {{ t("pages.game.start") }}
        </Button>
      </div>
    </div>

    <OpponentStrip
      v-if="game.gameInfos.value.state === 'started' && game.opponents.value.length > 0"
      :opponents="game.opponents.value"
    />

    <GameBoard
      v-if="game.gameInfos.value.state!=='created'"
      :highlighted-card="game.highlightedCard.value?.positionOnBoard"
      :game-board="game.gameBoard.value"
      :card-dragging-handler="game.cardDraggingHandler"
      :player="game.selfPlayer.value"
    ></GameBoard>

    <div class="relative">
      <ActionsLogs
        class="pointer-events-none absolute bottom-full w-full"
        :actions="game.logs.value"
      />

      <PlayerDeck
        :gameBoard="game.gameBoard.value"
        :player="game.selfPlayer.value"
        :card-dragging-handler="game.cardDraggingHandler"
        :game="game.gameInfos.value"
        :highlighted-card-index="game.highlightedCard.value?.indexInHand"
        @cancel-turn-modifications="game.cancelTurnModifications()"
        @draw-card="game.drawCard()"
        @end-turn="game.endTurn()"
      />
    </div>
  </main>
</template>
<script setup lang="ts">
import { BookOpenIcon, ExclamationTriangleIcon, CheckIcon } from "@heroicons/vue/20/solid";
import { ClipboardDocumentIcon } from "@heroicons/vue/20/solid";
import GameRulesModal from "@/components/GameRulesModal.vue";

const modal = useModal();
const { params } = useRoute();
const { t } = useI18n();

const { username } = useUsername();
const game = useGame(params.id, username.value);

const codeCopied = ref(false);
async function copyCode() {
  await navigator.clipboard.writeText(String(params.id));
  codeCopied.value = true;
  setTimeout(() => (codeCopied.value = false), 2000);
}
</script>

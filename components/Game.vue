<template>
  <div
    class="h-dvh flex flex-col items-center justify-center bg-body-bg text-body-text px-4"
    v-if="game.reconnecting.value && !game.connected.value"
  >
    <div class="flex flex-col items-center text-center gap-3">
      <div class="size-12 rounded-full bg-separator flex items-center justify-center mb-1 animate-pulse">
        <ExclamationTriangleIcon class="size-6 text-yellow-500" />
      </div>
      <h1 class="text-xl font-bold">Reconnecting...</h1>
      <p class="text-sm text-body-text-disabled">Attempting to reconnect to the game</p>
    </div>
  </div>

  <div
    class="h-dvh flex flex-col items-center justify-center bg-body-bg text-body-text px-4"
    v-else-if="game.disconnected.value"
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
    <header class="bg-white/80 backdrop-blur-sm shadow-sm relative z-10">
      <nav class="flex gap-1.5 md:gap-2 px-2 py-2 md:px-4 md:py-2.5 items-center justify-between">
        <div class="flex items-center gap-2 md:gap-3 min-w-0">
          <span v-if="game.gameInfos.value.state === 'created'" class="text-xs md:text-sm font-medium truncate">
            {{ t("pages.game.invite_code") }}
          </span>
          <template v-if="game.gameInfos.value.state === 'started'">
            <span
              v-if="game.selfPlayer.value.isPlaying"
              class="text-xs md:text-sm font-bold text-white bg-button-text-success px-2 md:px-3 py-1 rounded-full whitespace-nowrap shadow-sm shadow-green-300/50"
            >
              {{ t("pages.game.your_turn") }}
            </span>
            <span v-else class="text-xs md:text-sm text-body-text-disabled truncate">
              {{ t("pages.game.turn_of", { username: game.gameInfos.value.currentPlayerUsername }) }}
            </span>
          </template>

          <TimerDisplay
            v-if="game.gameInfos.value.state === 'started' && game.gameInfos.value.timerSettings.enabled"
            :remaining="game.timerRemaining.value"
            :expired="game.timerExpired.value"
            :strict="game.gameInfos.value.timerSettings.strict"
          />

        </div>

        <div class="flex gap-1.5 md:gap-2 shrink-0">
          <Button @click="modal.open(GameRulesModal)">
            <div class="flex gap-2">
              <BookOpenIcon class="size-4 text-body-text" />
            </div>
          </Button>

          <ConnectedUsernames
            v-if="game.connectedUsernames.value"
            :usernames="game.connectedUsernames.value"
            :reconnecting-players="game.reconnectingPlayers.value"
          />

          <Button @click="handleLeaveGame">
            <div class="flex gap-2">
              <ArrowRightStartOnRectangleIcon class="size-4 text-body-text" />
            </div>
          </Button>
        </div>
      </nav>

      <OpponentStrip
        v-if="game.gameInfos.value.state === 'started' && game.opponents.value.length > 0"
        :opponents="game.opponents.value"
        :reconnecting-players="game.reconnectingPlayers.value"
      />
    </header>

    <div v-if="game.gameInfos.value.state === 'created'" class="grow flex flex-col items-center justify-center text-center gap-6 p-4">
      <div class="flex flex-col items-center gap-3">
        <p class="text-sm text-body-text-disabled">{{ t("pages.game.invite_friends") }}</p>
        <div class="flex items-center gap-3">
          <span
            v-for="(digit, i) in String(params.id).split('')"
            :key="i"
            class="size-12 rounded-lg bg-white border border-separator flex items-center justify-center text-2xl font-bold font-mono shadow-sm"
          >
            {{ digit }}
          </span>
        </div>
        <button
          @click="copyLink"
          class="flex items-center gap-1.5 text-xs text-body-text-disabled hover:text-body-text transition-colors mt-1"
        >
          <CheckIcon v-if="linkCopied" class="size-3.5 text-button-text-success" />
          <ClipboardDocumentIcon v-else class="size-3.5" />
          {{ linkCopied ? t("pages.game.copied") : gameLink }}
        </button>
      </div>

      <TimerSettingsPanel
        v-if="game.selfPlayer.value?.admin"
        :timer-settings="game.gameInfos.value.timerSettings"
        @update="game.updateSettings({ timerSettings: $event })"
      />

      <div
        v-else-if="game.gameInfos.value.timerSettings.enabled"
        class="flex flex-col items-center gap-1 text-sm text-body-text-disabled"
      >
        <span>{{ t("pages.game.timer.label") }}: {{ game.gameInfos.value.timerSettings.durationSeconds }}s</span>
        <span>{{ game.gameInfos.value.timerSettings.strict ? t("pages.game.timer.strict") : t("pages.game.timer.relaxed") }}</span>
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

    <GameBoard
      v-if="game.gameInfos.value.state!=='created'"
      :highlighted-card="game.highlightedCard.value?.positionOnBoard"
      :game-board="game.gameBoard.value"
      :card-dragging-handler="game.cardDraggingHandler"
      :player="game.selfPlayer.value"
      :remote-cursors="game.remoteCursors.value"
      :move-cursor="game.moveCursor"
    ></GameBoard>

    <FloatingReaction
      v-for="reaction in game.reactions.value"
      :key="reaction.id"
      :reaction="reaction.reaction"
      :username="reaction.username"
    />

    <div v-if="game.gameInfos.value.state !== 'created'" class="relative">
      <ActivityChat
        class="absolute bottom-full w-full z-10"
        :feed="game.feedEntries.value"
        @send="game.sendChatMessage($event)"
        @react="game.sendReaction($event)"
      />

      <PlayerDeck
        :gameBoard="game.gameBoard.value"
        :player="game.selfPlayer.value"
        :card-dragging-handler="game.cardDraggingHandler"
        :game="game.gameInfos.value"
        :highlighted-card-index="game.highlightedCard.value?.indexInHand"
        :draw-animation="game.drawAnimation.value"
        @cancel-turn-modifications="game.cancelTurnModifications()"
        @undo-last-action="game.undoLastAction()"
        @draw-card="game.drawCard()"
        @pass="game.pass()"
        @end-turn="game.endTurn()"
      />
    </div>
  </main>
</template>
<script setup lang="ts">
import { BookOpenIcon, ExclamationTriangleIcon, CheckIcon, ArrowRightStartOnRectangleIcon } from "@heroicons/vue/20/solid";
import { ClipboardDocumentIcon } from "@heroicons/vue/20/solid";
import GameRulesModal from "@/components/GameRulesModal.vue";

const modal = useModal();
const { params } = useRoute();
const { t } = useI18n();

const { username } = useUsername();
const game = useGame(params.id, username.value);

function handleLeaveGame() {
  if (game.gameInfos.value?.state === "started") {
    if (!confirm(t("pages.game.leave_game_confirm"))) {
      return;
    }
  }
  game.leaveGame();
  navigateTo("/");
}

const gameLink = computed(() => `${window.location.origin}/games/${params.id}`);
const linkCopied = ref(false);
async function copyLink() {
  await navigator.clipboard.writeText(gameLink.value);
  linkCopied.value = true;
  setTimeout(() => (linkCopied.value = false), 2000);
}
</script>

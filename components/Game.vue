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
      <nav class="flex gap-1 md:gap-2 px-2 py-2 md:px-4 md:py-2.5 items-center justify-between overflow-hidden">
        <div class="flex items-center gap-1.5 md:gap-2.5 min-w-0 overflow-x-auto">
          <div v-if="game.gameInfos.value.state === 'created'" class="flex items-center gap-1.5 shrink-0">
            <div class="size-6 rounded-full bg-separator flex items-center justify-center">
              <UserCircleIcon class="size-4 text-body-text-disabled" />
            </div>
            <span class="text-xs md:text-sm font-medium truncate">{{ username }}</span>
          </div>

          <template v-if="game.gameInfos.value.state === 'started'">
            <span class="player-entry shrink-0" :class="{ 'player-entry--active': game.selfPlayer.value.isPlaying }">
              <span class="player-dot" :class="{ 'player-dot--active': game.selfPlayer.value.isPlaying }" />
              <span class="player-name">{{ t("pages.game.you") }}</span>
              <span class="tile-count-compact">
                <span class="tile-icon" />
                {{ game.selfPlayer.value.cards.length }}
              </span>
              <span class="tile-count-full">
                <span
                  v-for="n in Math.min(game.selfPlayer.value.cards.length, maxVisibleTiles)"
                  :key="n"
                  class="mini-tile"
                />
                <span v-if="game.selfPlayer.value.cards.length > maxVisibleTiles" class="tile-overflow">...</span>
                <span class="tile-number">{{ game.selfPlayer.value.cards.length }}</span>
              </span>
            </span>
            <template
              v-for="(opponent, i) in game.opponents.value"
              :key="opponent.username"
            >
              <span class="player-entry shrink-0" :class="{ 'player-entry--their-turn': opponent.isPlaying }">
                <CpuChipIcon v-if="opponent.isAI" class="size-3 shrink-0" :class="opponent.isPlaying ? 'text-green-400' : 'text-body-text-disabled'" />
                <span
                  v-else
                  class="player-dot"
                  :class="[
                    opponent.isPlaying && 'player-dot--their-turn',
                    game.reconnectingPlayers.value?.has(opponent.username) && 'animate-pulse',
                  ]"
                  :style="!opponent.isPlaying ? { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] } : undefined"
                />
                <span class="player-name">{{ opponent.username }}</span>
                <span class="tile-count-compact">
                  <span class="tile-icon" />
                  {{ opponent.cardCount }}
                </span>
                <span class="tile-count-full">
                  <span
                    v-for="n in Math.min(opponent.cardCount, maxVisibleTiles)"
                    :key="n"
                    class="mini-tile"
                  />
                  <span v-if="opponent.cardCount > maxVisibleTiles" class="tile-overflow">...</span>
                  <span class="tile-number">{{ opponent.cardCount }}</span>
                </span>
              </span>
            </template>
          </template>

          <TimerDisplay
            v-if="game.gameInfos.value.state === 'started' && game.gameInfos.value.timerSettings.enabled"
            :remaining="game.timerRemaining.value"
            :expired="game.timerExpired.value"
            :strict="game.gameInfos.value.timerSettings.strict"
            class="shrink-0"
          />
        </div>

        <div class="flex items-center gap-1.5 md:gap-2 shrink-0">
          <Button
            v-if="game.gameInfos.value.state === 'started'"
            @click="drawPileOpen = true"
          >
            <div class="flex gap-2 items-center">
              <span class="stack-tiles">
                <span class="stack-tile stack-tile--back" />
                <span class="stack-tile" />
              </span>
              <span class="tabular-nums">{{ game.gameInfos.value.drawStackCount }}</span>
            </div>
          </Button>
          <UModal v-model="drawPileOpen" :ui="{ background: 'bg-body-bg' }">
            <div class="p-4">
              <h2 class="mb-2 font-bold">{{ t("pages.game.draw_pile") }}</h2>
              <p class="text-sm text-body-text-disabled">
                {{ t("pages.game.draw_pile_left", { n: game.gameInfos.value.drawStackCount }) }}
              </p>
            </div>
          </UModal>

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
          class="flex items-center gap-1.5 text-xs text-body-text-disabled hover:text-body-text transition-colors mt-1 max-w-full"
        >
          <CheckIcon v-if="linkCopied" class="size-3.5 shrink-0 text-button-text-success" />
          <ClipboardDocumentIcon v-else class="size-3.5 shrink-0" />
          <span class="truncate">{{ linkCopied ? t("pages.game.copied") : gameLink }}</span>
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

    <div v-if="game.gameInfos.value.state!=='created'" class="flex-1 flex flex-col relative min-h-0">
      <GameBoard
        :highlighted-card="game.highlightedCard.value?.positionOnBoard"
        :game-board="game.gameBoard.value"
        :card-dragging-handler="game.cardDraggingHandler"
        :player="game.selfPlayer.value"
        :remote-cursors="game.remoteCursors.value"
        :move-cursor="game.moveCursor"
      />

      <ActivityChat
        class="absolute bottom-2 left-2 z-50 pointer-events-none"
        :feed="game.feedEntries.value"
        @send="game.sendChatMessage($event)"
        @react="game.sendReaction($event)"
      />
    </div>

    <FloatingReaction
      v-for="reaction in game.reactions.value"
      :key="reaction.id"
      :reaction="reaction.reaction"
      :username="reaction.username"
    />

    <div v-if="game.gameInfos.value.state !== 'created'" class="relative">
    <HeartsRain v-if="showHearts" :key="heartsKey" />

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
import { BookOpenIcon, ExclamationTriangleIcon, CheckIcon, ArrowRightStartOnRectangleIcon, UserCircleIcon, CpuChipIcon } from "@heroicons/vue/20/solid";
import { ClipboardDocumentIcon } from "@heroicons/vue/20/solid";
import GameRulesModal from "@/components/GameRulesModal.vue";

const PLAYER_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b",
  "#a855f7", "#ec4899", "#14b8a6", "#f97316",
];

const maxVisibleTiles = computed(() => {
  const totalPlayers = 1 + (game.opponents.value?.length ?? 0);
  return totalPlayers >= 3 ? 10 : 14;
});

const modal = useModal();
const { params } = useRoute();
const { t } = useI18n();

const { username } = useUsername();
const game = useGame(params.id, username.value);

watch(
  () => game.gameInfos.value,
  (infos) => {
    if (
      infos?.isAIGame &&
      infos.state === "created" &&
      game.selfPlayer.value?.canStartGame
    ) {
      game.startGame();
    }
  },
  { immediate: true },
);

function handleLeaveGame() {
  if (game.gameInfos.value?.state === "started") {
    if (!confirm(t("pages.game.leave_game_confirm"))) {
      return;
    }
  }
  game.leaveGame();
  navigateTo("/");
}

const showHearts = ref(false);
const heartsKey = ref(0);

watch(() => game.feedEntries.value.length, () => {
  const last = game.feedEntries.value[game.feedEntries.value.length - 1];
  if (last?.type === "chat" && last.text.trim().toLowerCase() === "/elly") {
    heartsKey.value++;
    showHearts.value = true;
    setTimeout(() => { showHearts.value = false; }, 13000);
  }
});

const gameLink = computed(() => `${window.location.origin}/games/${params.id}`);
const linkCopied = ref(false);
const drawPileOpen = ref(false);
async function copyLink() {
  await navigator.clipboard.writeText(gameLink.value);
  linkCopied.value = true;
  setTimeout(() => (linkCopied.value = false), 2000);
}
</script>
<style scoped>
.player-entry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 6px;
  border-radius: 6px;
  transition: background 150ms ease;
}

.player-entry--active {
  background: rgba(22, 163, 74, 0.08);
}

.player-entry--their-turn {
  background: rgba(22, 163, 74, 0.05);
}

.player-dot--their-turn {
  background: #86efac;
}

.player-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d6d3d1;
  flex-shrink: 0;
}

.player-dot--active {
  background: #16a34a;
  box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
  50% { box-shadow: 0 0 0 3px rgba(22, 163, 74, 0); }
}

.player-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  color: #57534e;
}

.player-entry--active .player-name {
  color: #16a34a;
}

.tile-count-compact {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #78716c;
}

.tile-count-full {
  display: none;
  align-items: center;
  gap: 1px;
}

@media (min-width: 768px) {
  .tile-count-compact { display: none; }
  .tile-count-full { display: inline-flex; }
}

.tile-icon {
  display: inline-block;
  width: 8px;
  height: 11px;
  border-radius: 2px;
  background: #a8a29e;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.mini-tile {
  display: inline-block;
  width: 7px;
  height: 10px;
  border-radius: 1.5px;
  background: #b8b5af;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
}

.tile-overflow {
  font-size: 9px;
  font-weight: 700;
  color: #a8a29e;
  margin-left: 1px;
  letter-spacing: -0.5px;
}

.tile-number {
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #78716c;
  margin-left: 3px;
}

.stack-tiles {
  position: relative;
  width: 12px;
  height: 14px;
}

.stack-tile {
  position: absolute;
  width: 9px;
  height: 12px;
  border-radius: 2px;
  background: #44403c;
  border: 1px solid rgba(0, 0, 0, 0.15);
  bottom: 0;
  right: 0;
}

.stack-tile--back {
  background: #78716c;
  top: 0;
  left: 0;
  right: auto;
  bottom: auto;
}
</style>

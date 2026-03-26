import type {
  GameInfosDto,
  TimerSettings,
} from "@/app/Game/application/Game";
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  OpponentDto,
  RemoteCursor,
} from "@/app/WebSocket/infrastructure/types";
import GameEndModal from "@/components/GameEndModal.vue";
import { makeCardDraggingHandler } from "@/logic/cardDragging";
import { setupGameSocket } from "@/logic/gameSocket";
import { useSound } from "@/composables/useSound";

type HighlightedCard = {
  positionOnBoard?: CardPositionOnBoard;
  indexInHand?: number;
};

export const useGame = (gameId: any, username: any) => {
  if (typeof gameId !== "string") {
    throw new Error("Game id is not a string");
  }

  if (typeof username !== "string") {
    throw new Error("Username is not a string");
  }

  const modal = useModal();
  const { t } = useI18n();
  const { play } = useSound();

  let wasPlaying = false;

  const connected = ref(false);
  const disconnected = ref<boolean>();
  const gameInfos = ref<GameInfosDto>();
  const selfPlayer = ref<PlayerDto>();
  const gameBoard = ref<GameBoardDto>();
  const connectedUsernames = ref<Record<string, boolean>>();
  const opponents = ref<OpponentDto[]>([]);
  const highlightedCard = ref<HighlightedCard>();
  const remoteCursors = ref<Map<string, RemoteCursor>>(new Map());

  const timerRemaining = ref<number | null>(null);
  const timerExpired = ref(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let timerForcedTurn = false;

  const clearLocalTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const TIMER_WARNING_THRESHOLD = 10;

  const startLocalTimer = (durationSeconds: number) => {
    clearLocalTimer();
    timerRemaining.value = durationSeconds;
    timerExpired.value = false;

    timerInterval = setInterval(() => {
      if (timerRemaining.value !== null && timerRemaining.value > 0) {
        timerRemaining.value--;
        if (timerRemaining.value <= TIMER_WARNING_THRESHOLD && timerRemaining.value > 0) {
          play("timer-tick", 0.3);
        }
      } else {
        clearLocalTimer();
      }
    }, 1000);
  };

  const actionsLogs = ref<Array<string>>([]);
  const logAction = (action: string) => actionsLogs.value.push(action);
  const logs = computed(() => actionsLogs.value.slice(-5));

  const pick = <T>(...items: T[]): T =>
    items[Math.floor(Math.random() * items.length)];

  const displayName = (player: PlayerDto) =>
    player.id === selfPlayer.value?.id ? t("toast.you") : player.username;

  const {
    startGame,
    leaveGame,
    cancelTurnModifications,
    drawCard,
    endTurn,
    pass,
    moveCardAlone,
    moveCardToCombination,
    placeCardAlone,
    placeCardInCombination,
    returnCardToHand,
    moveCursor,
    undoLastAction: rawUndoLastAction,
    updateSettings,
  } = setupGameSocket({
    gameId,
    username,
    onSelfPlayerUpdate(newSelfPlayer) {
      if (newSelfPlayer.isPlaying && !wasPlaying) {
        play("your-turn");
      }
      wasPlaying = newSelfPlayer.isPlaying;
      selfPlayer.value = newSelfPlayer;
      undoPending = false;
    },
    onGameBoardUpdate(newGameBoard) {
      gameBoard.value = newGameBoard;
    },
    onGameInfosUpdate(newGameInfos) {
      if (
        newGameInfos.state === "started" &&
        gameInfos.value?.state === "created"
      ) {
        play("game-start");
        logAction(
          t("toast.player_actions.game_started", {
            name: newGameInfos.currentPlayerUsername,
          }),
        );
      }

      if (
        newGameInfos.state === "ended" &&
        gameInfos.value?.state !== "ended"
      ) {
        const isWinner = newGameInfos.winnerUsername === username;
        play(isWinner ? "game-end-win" : "game-end-lose");
        clearLocalTimer();
        timerRemaining.value = null;
        timerExpired.value = false;

        modal.open(GameEndModal, {
          winnerUsername: newGameInfos.winnerUsername,
          selfUsername: username,
          endReason: newGameInfos.endReason,
        });
        if (newGameInfos.winnerUsername) {
          const name =
            newGameInfos.winnerUsername === username
              ? t("toast.you")
              : newGameInfos.winnerUsername;
          logAction(t("toast.player_actions.won", { name }));
        } else {
          logAction(t("toast.player_actions.player_left"));
        }
      }
      gameInfos.value = newGameInfos;
    },
    onConnectedUsernamesUpdate(newConnectedUsernames) {
      connectedUsernames.value = newConnectedUsernames;
    },
    onOpponentsUpdate(newOpponents) {
      opponents.value = newOpponents;
    },
    onPlayerPassed(player) {
      const name = displayName(player);
      if (timerForcedTurn) {
        timerForcedTurn = false;
        logAction(t("toast.player_actions.timer_forced_pass", { name }));
      } else {
        logAction(
          t(
            pick(
              "toast.player_actions.passed_1",
              "toast.player_actions.passed_2",
              "toast.player_actions.passed_3",
            ),
            { name },
          ),
        );
      }
    },
    onPlayerCanceledTurnModifications(player) {
      const name = displayName(player);
      logAction(
        t(
          pick(
            "toast.player_actions.canceled_1",
            "toast.player_actions.canceled_2",
            "toast.player_actions.canceled_3",
          ),
          { name },
        ),
      );
    },
    onPlayerUndoneAction(player) {
      const name = displayName(player);
      logAction(t("toast.player_actions.undone", { name }));
    },
    onPlayerDrawnCard(player) {
      const name = displayName(player);
      const count = player.cards.length;
      if (timerForcedTurn) {
        timerForcedTurn = false;
        logAction(t("toast.player_actions.timer_forced_draw", { name }));
      } else {
        logAction(
          t(
            pick(
              "toast.player_actions.drawn_card_1",
              "toast.player_actions.drawn_card_2",
              "toast.player_actions.drawn_card_3",
            ),
            { name, count },
          ),
        );
      }
      if (player.id === selfPlayer.value?.id) {
        play("card-draw");
        highlightedCard.value = {
          indexInHand: player.cards.length - 1,
        };
      }
    },
    onPlayerPlayed(player) {
      if (gameInfos.value?.state === "ended") return;
      const name = displayName(player);
      const count = player.cards.length;

      let key: string;
      if (count === 1) {
        key = "toast.player_actions.played_one_left";
      } else if (count <= 3) {
        key = "toast.player_actions.played_few_left";
      } else {
        key = pick(
          "toast.player_actions.played_1",
          "toast.player_actions.played_2",
        );
      }

      logAction(t(key, { name, count }));
    },
    onPlayerMovedCard(player, cardPosition) {
      if (player.id === selfPlayer.value?.id) {
        play("card-place");
        return;
      }
      play("card-place-opponent", 0.4);
      highlightedCard.value = {
        positionOnBoard: cardPosition,
      };
    },
    onCursorUpdate(cursor) {
      const updated = new Map(remoteCursors.value);
      updated.set(cursor.username, cursor);
      remoteCursors.value = updated;
    },
    onTimerStart(durationSeconds) {
      startLocalTimer(durationSeconds);
    },
    onTimerExpired() {
      timerExpired.value = true;
      clearLocalTimer();
      timerRemaining.value = 0;
      play("timer-up", 0.5);
      if (gameInfos.value?.timerSettings.strict) {
        timerForcedTurn = true;
      }
    },
    onSettingsUpdate(settings) {
      if (gameInfos.value) {
        gameInfos.value = {
          ...gameInfos.value,
          timerSettings: settings.timerSettings,
        };
      }
    },
    onConnect() {
      connected.value = true;
      disconnected.value = false;
    },
    onDisconnect() {
      connected.value = false;
      disconnected.value = true;
      clearLocalTimer();
    },
  });

  let undoPending = false;
  const undoLastAction = () => {
    if (undoPending) return;
    undoPending = true;
    rawUndoLastAction();
  };

  const cardDraggingHandler = makeCardDraggingHandler({
    placeCardAlone,
    placeCardInCombination,
    moveCardAlone,
    moveCardToCombination,
    returnCardToHand,
  });

  return {
    connected,
    disconnected,
    gameInfos,
    selfPlayer,
    gameBoard,
    connectedUsernames,
    opponents,
    highlightedCard,
    remoteCursors,
    logs,
    timerRemaining,
    timerExpired,
    startGame,
    leaveGame,
    cancelTurnModifications,
    undoLastAction,
    drawCard,
    endTurn,
    pass,
    moveCursor,
    updateSettings,
    cardDraggingHandler,
  };
};

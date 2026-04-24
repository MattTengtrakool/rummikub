import type { AIDifficulty } from "@/app/AI/domain/types";
import type { CardColor, CardNumber } from "@/app/Card/domain/dtos/card";
import type {
  GameInfosDto,
  TimerSettings,
} from "@/app/Game/application/Game";
import type { BoardPosition } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type {
  ChatMessage,
  OpponentDto,
  ReactionMessage,
  RemoteCursor,
} from "@/app/WebSocket/infrastructure/types";
import GameEndModal from "@/components/GameEndModal.vue";
import { makeCardDraggingHandler } from "@/logic/cardDragging";
import { setupGameSocket } from "@/logic/gameSocket";
import { useSound } from "@/composables/useSound";

type HighlightedCard = {
  positionOnBoard?: BoardPosition;
  indexInHand?: number;
};

export type DrawAnimationData = {
  color: CardColor;
  number: CardNumber;
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
  let hasShownGroupTip = false;

  const connected = ref(false);
  const disconnected = ref(false);
  const reconnecting = ref(false);
  const gameInfos = ref<GameInfosDto>();
  const selfPlayer = ref<PlayerDto>();
  const gameBoard = ref<GameBoardDto>();
  const connectedUsernames = ref<Record<string, boolean>>();
  const opponents = ref<OpponentDto[]>([]);
  const highlightedCard = ref<HighlightedCard>();
  const remoteCursors = ref<Map<string, RemoteCursor>>(new Map());
  const reconnectingPlayers = ref<Map<string, number>>(new Map());
  const reactions = ref<(ReactionMessage & { id: number })[]>([]);
  const drawAnimation = ref<DrawAnimationData | null>(null);
  let reactionIdCounter = 0;

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

  type FeedEntry = {
    type: "action" | "chat";
    text: string;
    username?: string;
  };

  const feedEntries = ref<FeedEntry[]>([]);
  const logAction = (action: string) =>
    feedEntries.value.push({ type: "action", text: action });

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
    placeCard,
    moveCard,
    moveCards,
    returnCard,
    moveCursor,
    undoLastAction: rawUndoLastAction,
    updateSettings,
    addAIPlayer,
    removeAIPlayer,
    sendChatMessage,
    sendReaction,
  } = setupGameSocket({
    gameId,
    username,
    onSelfPlayerUpdate(newSelfPlayer) {
      if (newSelfPlayer.isPlaying && !wasPlaying) {
        play("your-turn");

        if (
          !hasShownGroupTip &&
          gameBoard.value &&
          gameBoard.value.combinations.some((c) => c.tiles.length >= 2)
        ) {
          hasShownGroupTip = true;
          const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
          const tipKey = isTouch
            ? "toast.tips.group_drag_touch"
            : "toast.tips.group_drag";
          setTimeout(() => {
            logAction(t(tipKey));
          }, 1200);
        }
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

        if (newGameInfos.winnerUsername) {
          const name =
            newGameInfos.winnerUsername === username
              ? t("toast.you")
              : newGameInfos.winnerUsername;
          logAction(t("toast.player_actions.won", { name }));
        } else {
          logAction(t("toast.player_actions.player_left"));
        }

        nextTick(() => {
          modal.open(GameEndModal, {
            winnerUsername: newGameInfos.winnerUsername,
            selfUsername: username,
            endReason: newGameInfos.endReason,
          });
        });
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
      play("button-click", 0.4);
    },
    onPlayerUndoneAction(player) {
      const name = displayName(player);
      logAction(t("toast.player_actions.undone", { name }));
      play("button-click", 0.4);
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
        const drawnCard = player.cards[player.cards.length - 1];
        if (drawnCard) {
          drawAnimation.value = { color: drawnCard.color, number: drawnCard.number };
          setTimeout(() => { drawAnimation.value = null; }, 700);
        }
        highlightedCard.value = {
          indexInHand: player.cards.length - 1,
        };
        setTimeout(() => {
          highlightedCard.value = undefined;
        }, 700);
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
    onPlayerMovedCard(player, position) {
      if (player.id === selfPlayer.value?.id) {
        return;
      }
      play("card-place-opponent", 0.4);
      highlightedCard.value = {
        positionOnBoard: position,
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
    onChatMessage(message) {
      feedEntries.value.push({
        type: "chat",
        text: message.text,
        username: message.username === username ? t("toast.you") : message.username,
      });
    },
    onPlayerReconnecting(reconnectingUsername, graceSeconds) {
      const updated = new Map(reconnectingPlayers.value);
      updated.set(reconnectingUsername, graceSeconds);
      reconnectingPlayers.value = updated;
      logAction(t("toast.player_actions.reconnecting", { name: reconnectingUsername }));
    },
    onPlayerReconnected(reconnectedUsername) {
      const updated = new Map(reconnectingPlayers.value);
      updated.delete(reconnectedUsername);
      reconnectingPlayers.value = updated;
      logAction(t("toast.player_actions.reconnected", { name: reconnectedUsername }));
    },
    onReactionReceived(message) {
      const id = reactionIdCounter++;
      reactions.value.push({ ...message, id });
      play("button-click", 0.3);
      setTimeout(() => {
        reactions.value = reactions.value.filter((r) => r.id !== id);
      }, 3000);
    },
    onConnect() {
      connected.value = true;
      disconnected.value = false;
      reconnecting.value = false;
    },
    onDisconnect() {
      connected.value = false;
      reconnecting.value = true;
      clearLocalTimer();
      setTimeout(() => {
        if (!connected.value) {
          reconnecting.value = false;
          disconnected.value = true;
        }
      }, 15000);
    },
  });

  let undoPending = false;
  const undoLastAction = () => {
    if (undoPending) return;
    undoPending = true;
    rawUndoLastAction();
  };

  const cardDraggingHandler = makeCardDraggingHandler({
    placeCard,
    moveCard,
    moveCards,
    returnCard,
    onCardPlaced: () => play("card-place"),
  });

  return {
    connected,
    disconnected,
    reconnecting,
    reconnectingPlayers,
    reactions,
    drawAnimation,
    gameInfos,
    selfPlayer,
    gameBoard,
    connectedUsernames,
    opponents,
    highlightedCard,
    remoteCursors,
    feedEntries,
    timerRemaining,
    timerExpired,
    startGame,
    leaveGame,
    cancelTurnModifications,
    undoLastAction,
    drawCard,
    endTurn: () => { play("button-click", 0.4); endTurn(); },
    pass: () => { play("button-click", 0.4); pass(); },
    moveCursor,
    updateSettings,
    addAIPlayer: (difficulty: AIDifficulty) => addAIPlayer(difficulty),
    removeAIPlayer: (playerId: string) => removeAIPlayer(playerId),
    sendChatMessage,
    sendReaction,
    cardDraggingHandler,
  };
};

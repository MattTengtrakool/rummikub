import type { GameInfosDto } from "@/app/Game/application/Game";
import type { CardPositionOnBoard } from "@/app/GameBoard/application/GameBoard";
import type { GameBoardDto } from "@/app/GameBoard/domain/dtos/gameBoard";
import type { PlayerDto } from "@/app/Player/domain/dtos/player";
import type { OpponentDto } from "@/app/WebSocket/infrastructure/types";
import GameEndModal from "@/components/GameEndModal.vue";
import { makeCardDraggingHandler } from "@/logic/cardDragging";
import { setupGameSocket } from "@/logic/gameSocket";

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

  const connected = ref(false);
  const disconnected = ref<boolean>();
  const gameInfos = ref<GameInfosDto>();
  const selfPlayer = ref<PlayerDto>();
  const gameBoard = ref<GameBoardDto>();
  const connectedUsernames = ref<Record<string, boolean>>();
  const opponents = ref<OpponentDto[]>([]);
  const highlightedCard = ref<HighlightedCard>();

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
  } = setupGameSocket({
    gameId,
    username,
    onSelfPlayerUpdate(newSelfPlayer) {
      selfPlayer.value = newSelfPlayer;
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

      if (newGameInfos.state === "ended") {
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
    onPlayerDrawnCard(player) {
      const name = displayName(player);
      const count = player.cards.length;
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
      if (player.id === selfPlayer.value?.id) {
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
        return;
      }
      highlightedCard.value = {
        positionOnBoard: cardPosition,
      };
    },
    onConnect() {
      connected.value = true;
      disconnected.value = false;
    },
    onDisconnect() {
      connected.value = false;
      disconnected.value = true;
    },
  });

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
    logs,
    startGame,
    leaveGame,
    cancelTurnModifications,
    drawCard,
    endTurn,
    pass,
    cardDraggingHandler,
  };
};

import type { DraggingCardInfo } from "@/app/WebSocket/infrastructure/types";

const draggingCard = ref<DraggingCardInfo | undefined>();

export const useDraggingCard = () => {
  const startDragging = (card: DraggingCardInfo) => {
    draggingCard.value = card;
  };

  const stopDragging = () => {
    draggingCard.value = undefined;
  };

  return {
    draggingCard: readonly(draggingCard),
    startDragging,
    stopDragging,
  };
};

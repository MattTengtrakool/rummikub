const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.25;
const WHEEL_SENSITIVITY = 0.002;

export const useBoardZoom = () => {
  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);

  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  let lastTouchDist = 0;
  let lastTouchMidX = 0;
  let lastTouchMidY = 0;

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomAtPoint = (newScale: number, anchorX: number, anchorY: number) => {
    newScale = clampScale(newScale);
    const ratio = newScale / scale.value;
    translateX.value = anchorX - ratio * (anchorX - translateX.value);
    translateY.value = anchorY - ratio * (anchorY - translateY.value);
    scale.value = newScale;
  };

  const zoomIn = (containerEl?: HTMLElement | null) => {
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      zoomAtPoint(scale.value + ZOOM_STEP, rect.width / 2, rect.height / 2);
    } else {
      scale.value = clampScale(scale.value + ZOOM_STEP);
    }
  };

  const zoomOut = (containerEl?: HTMLElement | null) => {
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      zoomAtPoint(scale.value - ZOOM_STEP, rect.width / 2, rect.height / 2);
    } else {
      scale.value = clampScale(scale.value - ZOOM_STEP);
    }
  };

  const resetZoom = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  const fitToScreen = (
    containerEl: HTMLElement | null,
    contentBounds: { x: number; y: number; width: number; height: number } | null,
  ) => {
    if (!containerEl || !contentBounds || contentBounds.width === 0 || contentBounds.height === 0) {
      resetZoom();
      return;
    }
    const cRect = containerEl.getBoundingClientRect();

    const scaleX = cRect.width / contentBounds.width;
    const scaleY = cRect.height / contentBounds.height;
    const newScale = Math.min(1, clampScale(Math.min(scaleX, scaleY) * 0.85));

    const centerX = contentBounds.x + contentBounds.width / 2;
    const centerY = contentBounds.y + contentBounds.height / 2;

    translateX.value = cRect.width / 2 - centerX * newScale;
    translateY.value = cRect.height / 2 - centerY * newScale;
    scale.value = newScale;
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * WHEEL_SENSITIVITY;
      const newScale = clampScale(scale.value + delta * scale.value);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const ratio = newScale / scale.value;
      translateX.value = cursorX - ratio * (cursorX - translateX.value);
      translateY.value = cursorY - ratio * (cursorY - translateY.value);
      scale.value = newScale;
    }
  };

  const onPointerDown = (e: PointerEvent, isDraggingCard: boolean) => {
    if (isDraggingCard) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      startTranslateX = translateX.value;
      startTranslateY = translateY.value;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isPanning) return;
    translateX.value = startTranslateX + (e.clientX - panStartX);
    translateY.value = startTranslateY + (e.clientY - panStartY);
  };

  const onPointerUp = () => {
    isPanning = false;
  };

  let singleTouchId: number | null = null;

  const touchDist = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = (e: TouchEvent, isDraggingCard: boolean) => {
    if (e.touches.length === 2) {
      singleTouchId = null;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      lastTouchDist = touchDist(t1, t2);
      lastTouchMidX = (t1.clientX + t2.clientX) / 2;
      lastTouchMidY = (t1.clientY + t2.clientY) / 2;
      isPanning = true;
      panStartX = lastTouchMidX;
      panStartY = lastTouchMidY;
      startTranslateX = translateX.value;
      startTranslateY = translateY.value;
    } else if (e.touches.length === 1 && !isDraggingCard) {
      const t = e.touches[0];
      singleTouchId = t.identifier;
      isPanning = false;
      panStartX = t.clientX;
      panStartY = t.clientY;
      startTranslateX = translateX.value;
      startTranslateY = translateY.value;
    }
  };

  const PAN_THRESHOLD = 8;

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      singleTouchId = null;
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = touchDist(t1, t2);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const pinchRatio = dist / lastTouchDist;
      const newScale = clampScale(scale.value * pinchRatio);
      const ratio = newScale / scale.value;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const anchorX = midX - rect.left;
      const anchorY = midY - rect.top;

      translateX.value = anchorX - ratio * (anchorX - translateX.value) + (midX - panStartX);
      translateY.value = anchorY - ratio * (anchorY - translateY.value) + (midY - panStartY);

      scale.value = newScale;
      lastTouchDist = dist;
      panStartX = midX;
      panStartY = midY;
    } else if (e.touches.length === 1 && singleTouchId !== null) {
      const t = Array.from(e.touches).find((t) => t.identifier === singleTouchId);
      if (!t) return;

      if (!isPanning) {
        const dx = t.clientX - panStartX;
        const dy = t.clientY - panStartY;
        if (Math.hypot(dx, dy) >= PAN_THRESHOLD) {
          isPanning = true;
          panStartX = t.clientX;
          panStartY = t.clientY;
          startTranslateX = translateX.value;
          startTranslateY = translateY.value;
        }
        return;
      }

      e.preventDefault();
      translateX.value = startTranslateX + (t.clientX - panStartX);
      translateY.value = startTranslateY + (t.clientY - panStartY);
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      isPanning = false;
    }
    if (e.touches.length === 0) {
      singleTouchId = null;
    }
  };

  const smoothPanning = ref(false);

  const smoothFitToScreen = (
    containerEl: HTMLElement | null,
    contentBounds: { x: number; y: number; width: number; height: number } | null,
  ) => {
    smoothPanning.value = true;
    fitToScreen(containerEl, contentBounds);
    setTimeout(() => {
      smoothPanning.value = false;
    }, 400);
  };

  const isPositionInView = (
    boardX: number,
    boardY: number,
    cellW: number,
    cellH: number,
    containerEl: HTMLElement | null,
  ): boolean => {
    if (!containerEl) return true;
    const rect = containerEl.getBoundingClientRect();
    const margin = 40;

    const screenX = boardX * cellW * scale.value + translateX.value;
    const screenY = boardY * cellH * scale.value + translateY.value;

    return (
      screenX >= margin &&
      screenX <= rect.width - margin &&
      screenY >= margin &&
      screenY <= rect.height - margin
    );
  };

  const panTo = (
    boardX: number,
    boardY: number,
    cellW: number,
    cellH: number,
    containerEl: HTMLElement | null,
  ) => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();

    const targetScreenX = rect.width / 2;
    const targetScreenY = rect.height / 2;

    smoothPanning.value = true;
    translateX.value = targetScreenX - boardX * cellW * scale.value;
    translateY.value = targetScreenY - boardY * cellH * scale.value;

    setTimeout(() => {
      smoothPanning.value = false;
    }, 400);
  };

  const transformStyle = computed(() =>
    `transform: scale(${scale.value}) translate(${translateX.value / scale.value}px, ${translateY.value / scale.value}px); transform-origin: 0 0;`
  );

  return {
    scale,
    translateX,
    translateY,
    transformStyle,
    smoothPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    smoothFitToScreen,
    isPositionInView,
    panTo,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

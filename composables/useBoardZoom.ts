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

  const zoomIn = () => {
    scale.value = clampScale(scale.value + ZOOM_STEP);
  };

  const zoomOut = () => {
    scale.value = clampScale(scale.value - ZOOM_STEP);
  };

  const resetZoom = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  const fitToScreen = (containerEl: HTMLElement | null, contentEl: HTMLElement | null) => {
    if (!containerEl || !contentEl) {
      resetZoom();
      return;
    }
    const cRect = containerEl.getBoundingClientRect();
    const sRect = contentEl.scrollWidth;
    const sHeight = contentEl.scrollHeight;

    if (sRect === 0 || sHeight === 0) {
      resetZoom();
      return;
    }

    const scaleX = cRect.width / sRect;
    const scaleY = cRect.height / sHeight;
    scale.value = clampScale(Math.min(scaleX, scaleY) * 0.95);
    translateX.value = 0;
    translateY.value = 0;
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

  const touchDist = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      lastTouchDist = touchDist(t1, t2);
      lastTouchMidX = (t1.clientX + t2.clientX) / 2;
      lastTouchMidY = (t1.clientY + t2.clientY) / 2;
      isPanning = true;
      panStartX = lastTouchMidX;
      panStartY = lastTouchMidY;
      startTranslateX = translateX.value;
      startTranslateY = translateY.value;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
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
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      isPanning = false;
    }
  };

  const transformStyle = computed(() =>
    `transform: scale(${scale.value}) translate(${translateX.value / scale.value}px, ${translateY.value / scale.value}px); transform-origin: 0 0;`
  );

  return {
    scale,
    translateX,
    translateY,
    transformStyle,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

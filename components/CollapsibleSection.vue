<script setup lang="ts">
const props = withDefaults(defineProps<{
  defaultCollapsed?: boolean;
  handlePosition?: "top" | "bottom";
}>(), {
  defaultCollapsed: false,
  handlePosition: "top",
});

const collapsed = ref(props.defaultCollapsed);

const dragStartY = ref<number | null>(null);
const didDrag = ref(false);
const THRESHOLD = 15;

function onPointerDown(e: PointerEvent) {
  dragStartY.value = e.clientY;
  didDrag.value = false;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (dragStartY.value === null) return;
  const dy = e.clientY - dragStartY.value;
  if (Math.abs(dy) < THRESHOLD || didDrag.value) return;

  didDrag.value = true;

  // handlePosition=bottom → content above → drag up collapses
  // handlePosition=top    → content below → drag down collapses
  const collapseSign = props.handlePosition === "bottom" ? -1 : 1;

  if (Math.sign(dy) === collapseSign && !collapsed.value) {
    collapsed.value = true;
  } else if (Math.sign(dy) === -collapseSign && collapsed.value) {
    collapsed.value = false;
  }
}

function onPointerUp() {
  if (!didDrag.value && dragStartY.value !== null) {
    collapsed.value = !collapsed.value;
  }
  dragStartY.value = null;
  didDrag.value = false;
}
</script>

<template>
  <div>
    <button
      v-if="handlePosition === 'top'"
      class="handle pointer-events-auto"
      style="touch-action: none;"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <div
        class="pill"
        :class="collapsed ? 'pill--collapsed' : 'pill--expanded'"
      />
    </button>

    <div class="collapse-body" :class="{ 'collapse-body--hidden': collapsed }">
      <div class="overflow-hidden">
        <slot />
      </div>
    </div>

    <button
      v-if="handlePosition === 'bottom'"
      class="handle pointer-events-auto"
      style="touch-action: none;"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <div
        class="pill"
        :class="collapsed ? 'pill--collapsed' : 'pill--expanded'"
      />
    </button>
  </div>
</template>

<style scoped>
.handle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  cursor: ns-resize;
  user-select: none;
}

.pill {
  height: 3px;
  border-radius: 9999px;
  transition: width 150ms ease, background-color 150ms ease;
}

.pill--expanded {
  width: 20px;
  background: rgba(0, 0, 0, 0.06);
}

.pill--collapsed {
  width: 32px;
  background: rgba(0, 0, 0, 0.10);
}

.handle:hover .pill--expanded {
  background: rgba(0, 0, 0, 0.14);
}

.handle:hover .pill--collapsed {
  background: rgba(0, 0, 0, 0.20);
}

.collapse-body {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 200ms ease-out;
}

.collapse-body--hidden {
  grid-template-rows: 0fr;
}
</style>

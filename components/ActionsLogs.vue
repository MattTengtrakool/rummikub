<template>
  <div class="pointer-events-none p-2 flex flex-col-reverse gap-1 text-xs font-medium">
    <span
      v-for="(action, index) in actions.toReversed()"
      :key="action + index"
      :style="`opacity: ${Math.max(0.15, 1 - index * 0.2)}`"
    >
      {{ action }}
    </span>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  actions: Array<string>;
}>();
</script>

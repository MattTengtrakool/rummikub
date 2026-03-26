<script setup lang="ts">
const props = defineProps<{
  username: string;
  isConnected: boolean;
  isReconnecting?: boolean;
}>();
</script>
<template>
  <span
    class="relative flex gap-2 items-center bg-card-bg rounded-full px-3 py-1"
  >
    <span
      class="rounded-full size-2.5"
      :class="[
        isConnected ? 'bg-button-text-success' :
        isReconnecting ? 'bg-yellow-500 animate-pulse' :
        'bg-button-text-danger'
      ]"
    ></span>

    <span>{{ username }}</span>
    <span v-if="isReconnecting" class="text-[10px] text-yellow-600">Reconnecting...</span>
  </span>
</template>

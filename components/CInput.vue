<template>
  <UInput
    v-model="model"
    variant="none"
    class="h-9 bg-button-bg rounded-lg border"
  />
</template>
<script setup lang="ts" generic="T extends string | number | undefined">
defineProps<{
  type?: "text";
}>();

const model = defineModel<T>();
</script>

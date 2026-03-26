<script setup lang="ts">
import { NuxtLink } from "#components";

withDefaults(
  defineProps<{
    type?: "primary" | "secondary" | "danger" | "success" | "filled";
    text?: string;
    disabled?: boolean;
    href?: string;
  }>(),
  { type: "primary" },
);
</script>
<template>
  <component
    :is="href ? NuxtLink : 'button'"
    :to="!disabled && href"
    @click="$emit('click')"
    type="button"
    :disabled="disabled"
    class="h-9 px-5 rounded-lg justify-center items-center gap-2 inline-flex transition-colors"
    :class="{
      'bg-button-bg-disabled text-button-text-disabled': disabled,
      'bg-body-text text-white hover:bg-black/80': !disabled && type === 'filled',
      'bg-button-bg': !disabled && type !== 'filled',
      'text-button-text-danger': !disabled && type === 'danger',
      'text-button-text-success': !disabled && type === 'success',
      'text-body-text':
        !disabled && (type === 'primary' || type === 'secondary'),
    }"
  >
    <slot name="prefix"></slot>
    <div class="text-sm font-bold font-sans">
      <template v-if="text">{{ text }}</template>
      <slot v-else></slot>
    </div>
    <slot name="suffix"></slot>
  </component>
</template>

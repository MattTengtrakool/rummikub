<script setup lang="ts">
import { NuxtLink } from "#components";
import { useSound } from "@/composables/useSound";

const props = withDefaults(
  defineProps<{
    type?: "primary" | "secondary" | "danger" | "success" | "filled";
    text?: string;
    disabled?: boolean;
    href?: string;
    silent?: boolean;
  }>(),
  { type: "primary" },
);

const emit = defineEmits<{ click: [] }>();
const { play } = useSound();

const handleClick = (e: MouseEvent) => {
  if (props.disabled) return;

  if (!props.silent) {
    play("button-click", 0.5);
  }

  if (props.href) {
    e.preventDefault();
    emit("click");
    const target = props.href;
    setTimeout(() => { window.location.href = target; }, 80);
  } else {
    emit("click");
  }
};
</script>
<template>
  <component
    :is="href ? NuxtLink : 'button'"
    :to="!disabled && href"
    @click.prevent="handleClick"
    :type="href ? undefined : 'button'"
    :disabled="!href && disabled"
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

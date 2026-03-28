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
    play("button-click", 0.8);
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
    class="h-9 px-3 md:px-5 rounded-lg justify-center items-center gap-2 inline-flex transition-all duration-150"
    :class="{
      'bg-button-bg-disabled text-button-text-disabled': disabled,
      'bg-body-text text-white hover:bg-black/80 shadow-sm hover:shadow-md active:scale-[0.97]': !disabled && type === 'filled',
      'bg-button-text-success text-white hover:bg-button-text-success/90 shadow-sm shadow-green-300/30 hover:shadow-md active:scale-[0.97]': !disabled && type === 'success',
      'bg-black/[0.04] text-body-text hover:bg-black/[0.08] active:scale-[0.97]': !disabled && type === 'secondary',
      'bg-button-bg shadow-sm active:scale-[0.97] text-button-text-danger': !disabled && type === 'danger',
      'bg-button-bg shadow-sm active:scale-[0.97] text-body-text': !disabled && type === 'primary',
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

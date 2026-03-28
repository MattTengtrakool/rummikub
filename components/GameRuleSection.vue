<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/20/solid";

const props = withDefaults(
  defineProps<{
    label: string;
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: false },
);

const open = ref(props.defaultOpen);
</script>
<template>
  <div
    class="rounded-xl border transition-all"
    :class="open ? 'border-body-text/15 bg-black/[0.02] shadow-sm' : 'border-separator hover:border-body-text-disabled'"
  >
    <button
      @click="open = !open"
      class="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left"
    >
      <span class="text-sm font-semibold">{{ label }}</span>
      <ChevronDownIcon
        class="size-4 text-body-text-disabled shrink-0 transition-transform duration-200"
        :class="open && 'rotate-180'"
      />
    </button>
    <div
      v-if="open"
      class="px-3.5 pb-3.5 flex flex-col gap-2"
    >
      <div class="h-px bg-separator/50 -mt-0.5 mb-1" />
      <slot />
    </div>
  </div>
</template>

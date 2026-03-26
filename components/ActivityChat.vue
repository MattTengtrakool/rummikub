<template>
  <div>
    <div
      ref="scrollContainer"
      class="pointer-events-auto p-2 flex flex-col-reverse gap-1 text-xs font-medium max-h-24 overflow-y-auto"
      @scroll="onScroll"
    >
      <span
        v-for="(entry, index) in displayFeed"
        :key="index"
        :style="!scrolledUp ? `opacity: ${Math.max(0.15, 1 - index * 0.2)}` : ''"
      >
        <template v-if="entry.type === 'chat'">
          <span class="font-semibold">{{ entry.username }}</span>: {{ entry.text }}
        </template>
        <template v-else>
          {{ entry.text }}
        </template>
      </span>
    </div>

    <form
      @submit.prevent="send"
      class="pointer-events-auto flex items-center gap-2 px-2 pb-1"
    >
      <input
        v-model="draft"
        maxlength="500"
        placeholder="Send a message..."
        class="w-44 text-[11px] bg-transparent border-b border-transparent focus:border-body-text-disabled placeholder:text-body-text-disabled/50 outline-none py-0.5 transition-colors"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
type FeedEntry = {
  type: "action" | "chat";
  text: string;
  username?: string;
};

const props = defineProps<{
  feed: FeedEntry[];
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const draft = ref("");
const scrollContainer = ref<HTMLElement>();
const scrolledUp = ref(false);

const displayFeed = computed(() => [...props.feed].reverse());

function onScroll() {
  const el = scrollContainer.value;
  if (!el) return;
  scrolledUp.value = el.scrollTop < -4;
}

function send() {
  const text = draft.value.trim();
  if (!text) return;
  emit("send", text);
  draft.value = "";
}
</script>

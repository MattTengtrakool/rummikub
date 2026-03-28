<template>
  <div class="flex flex-col items-start">
    <template v-if="expanded">
      <div
        ref="scrollContainer"
        class="pointer-events-auto p-2 flex flex-col-reverse gap-1 text-xs font-medium overflow-y-auto scrollbar-hide max-w-[260px] md:max-w-[300px]"
        :class="isMobile ? 'max-h-[40dvh]' : 'max-h-24'"
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

      <div class="pointer-events-auto flex items-center gap-1.5 px-2 pb-1.5">
        <button
          @click="expanded = false"
          class="shrink-0 p-1.5 -m-1.5 text-body-text-disabled/40 hover:text-body-text-disabled transition-colors"
          title="Close chat"
        >
          <ChatBubbleLeftIcon class="size-4" />
        </button>
        <form @submit.prevent="send" class="flex items-center">
          <input
            v-model="draft"
            maxlength="500"
            placeholder="Message..."
            class="w-32 md:w-40 text-[11px] bg-transparent border-b border-transparent focus:border-body-text-disabled placeholder:text-body-text-disabled/50 outline-none py-0.5 transition-colors"
          />
        </form>
        <EmojiReactionPicker @react="emit('react', $event)" />
      </div>
    </template>

    <template v-else>
      <button
        @click="expanded = true"
        class="pointer-events-auto group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/70 hover:bg-white/90 shadow-sm border border-black/[0.04] backdrop-blur-sm transition-all"
      >
        <ChatBubbleLeftIcon class="size-3.5 text-body-text-disabled group-hover:text-body-text transition-colors" />
        <span
          v-if="lastEntry"
          class="text-[11px] text-body-text-disabled/70 group-hover:text-body-text-disabled truncate max-w-[140px] transition-colors"
        >
          {{ lastEntry }}
        </span>
        <span v-else class="text-[11px] text-body-text-disabled/60 group-hover:text-body-text-disabled transition-colors">
          Chat
        </span>
        <span v-if="hasUnread" class="size-1.5 rounded-full bg-blue-400 shrink-0" />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ChatBubbleLeftIcon } from "@heroicons/vue/20/solid";

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
  react: [reaction: import("@/app/WebSocket/infrastructure/types").ReactionType];
}>();

const draft = ref("");
const scrollContainer = ref<HTMLElement>();
const scrolledUp = ref(false);
const expanded = ref(false);
const hasUnread = ref(false);
const seenCount = ref(0);

const isMobile = ref(false);
onMounted(() => {
  const mq = window.matchMedia("(max-width: 767px)");
  isMobile.value = mq.matches;
  mq.addEventListener("change", (e) => { isMobile.value = e.matches; });
  seenCount.value = props.feed.length;
});

watch(() => props.feed.length, (newLen) => {
  if (!expanded.value && newLen > seenCount.value) {
    hasUnread.value = true;
  }
  if (expanded.value) {
    seenCount.value = newLen;
  }
});

watch(expanded, (open) => {
  if (open) {
    hasUnread.value = false;
    seenCount.value = props.feed.length;
  }
});

const displayFeed = computed(() => [...props.feed].slice(-5).reverse());

const lastEntry = computed(() => {
  const last = props.feed[props.feed.length - 1];
  if (!last) return null;
  return last.type === "chat" ? `${last.username}: ${last.text}` : last.text;
});

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

<style scoped>
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>

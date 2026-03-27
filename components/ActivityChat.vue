<template>
  <div>
    <template v-if="expanded || !isMobile">
      <div
        ref="scrollContainer"
        class="pointer-events-auto p-2 flex flex-col-reverse gap-1 text-xs font-medium overflow-y-auto scrollbar-hide"
        :class="isMobile ? 'max-h-[40vh]' : 'max-h-24'"
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

      <div class="pointer-events-auto flex items-center gap-2 px-2 pb-1">
        <form @submit.prevent="send" class="flex items-center">
          <input
            v-model="draft"
            maxlength="500"
            placeholder="Send a message..."
            class="w-36 md:w-44 text-[11px] bg-transparent border-b border-transparent focus:border-body-text-disabled placeholder:text-body-text-disabled/50 outline-none py-0.5 transition-colors"
          />
        </form>
        <EmojiReactionPicker @react="emit('react', $event)" />
        <button
          v-if="isMobile"
          @click="expanded = false"
          class="pointer-events-auto text-[10px] text-body-text-disabled ml-auto"
        >
          collapse
        </button>
      </div>
    </template>

    <template v-else>
      <div class="pointer-events-auto flex items-center gap-2 px-2 pb-1">
        <button
          @click="expanded = true"
          class="text-[11px] text-body-text-disabled truncate max-w-[200px]"
        >
          {{ lastEntry ?? 'Chat' }}
        </button>
      </div>
    </template>
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
  react: [reaction: import("@/app/WebSocket/infrastructure/types").ReactionType];
}>();

const draft = ref("");
const scrollContainer = ref<HTMLElement>();
const scrolledUp = ref(false);
const expanded = ref(false);

const isMobile = ref(false);
onMounted(() => {
  const mq = window.matchMedia("(max-width: 767px)");
  isMobile.value = mq.matches;
  mq.addEventListener("change", (e) => { isMobile.value = e.matches; });
});

const displayFeed = computed(() => [...props.feed].reverse());

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

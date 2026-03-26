<template>
  <main
    class="h-dvh bg-body-bg text-body-text flex flex-col items-center justify-center px-4 relative"
  >
    <div class="absolute top-4 left-4">
      <button
        v-if="!editingUsername"
        @click="startEditingUsername"
        class="flex items-center gap-2 hover:bg-black/5 rounded-full py-1.5 pl-1.5 pr-3 transition-colors"
      >
        <div class="size-7 rounded-full bg-separator flex items-center justify-center">
          <UserCircleIcon class="size-5 text-body-text-disabled" />
        </div>
        <span class="text-sm" :class="username ? 'text-body-text' : 'text-body-text-disabled'">
          {{ username || t("pages.home.set_username") }}
        </span>
      </button>
      <div v-else class="flex items-center gap-2 py-1.5 pl-1.5 pr-1.5">
        <div class="size-7 rounded-full bg-separator flex items-center justify-center">
          <UserCircleIcon class="size-5 text-body-text-disabled" />
        </div>
        <input
          ref="usernameInput"
          v-model="username"
          @blur="editingUsername = false"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
          :placeholder="t('pages.home.username')"
          class="text-sm bg-transparent outline-none border-b border-body-text-disabled w-28"
        />
      </div>
    </div>

    <div class="mt-auto flex flex-col items-center gap-3">
      <div class="relative flex items-end">
        <Card class="-rotate-12 -mr-1" color="red" :number="7" />
        <Card class="mb-1" color="black" :number="0" />
        <Card class="rotate-12 -ml-1" color="blue" :number="7" />
      </div>
      <h1 class="text-4xl font-bold tracking-tight">Rummikub</h1>
      <button
        @click="modal.open(GameRulesModal)"
        class="text-xs text-body-text-disabled hover:text-body-text transition-colors flex items-center gap-1.5"
      >
        <BookOpenIcon class="size-3.5" />
        {{ t("pages.home.see_rules") }}
      </button>
    </div>

    <div class="mt-12 mb-auto w-full max-w-xs flex flex-col items-center gap-5">
      <Button
        class="w-full"
        href="/games/create"
        target="_parent"
        no-prefetch
        type="filled"
      >
        {{ t("pages.home.create_game") }}
      </Button>

      <div class="flex gap-2 items-center w-full">
        <div class="h-px bg-separator grow" />
        <span class="text-xs text-body-text-disabled">{{ t("pages.home.or") }}</span>
        <div class="h-px bg-separator grow" />
      </div>

      <div class="flex gap-2 w-full">
        <CInput
          :placeholder="t('pages.home.code_join_game')"
          v-model="joinRoomId"
          @keydown.enter="joinRoom"
          maxlength="3"
          class="flex-1"
        />
        <Button
          :href="getJoinRoomUrl"
          :disabled="isBlank(joinRoomId)"
          type="primary"
        >
          {{ t("pages.home.join_game") }}
        </Button>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { useLightMode } from "@/composables/useLightMode";
import { BookOpenIcon } from "@heroicons/vue/20/solid";
import { UserCircleIcon } from "@heroicons/vue/20/solid";
import GameRulesModal from "@/components/GameRulesModal.vue";

const modal = useModal();
const { username } = useUsername();
const { t } = useI18n();

useLightMode();

const joinRoomId = ref("");
const getJoinRoomUrl = computed(() => `/games/${joinRoomId.value}`);
const joinRoom = () => navigateTo(getJoinRoomUrl.value);

const editingUsername = ref(false);
const usernameInput = ref<HTMLInputElement>();

function startEditingUsername() {
  editingUsername.value = true;
  nextTick(() => usernameInput.value?.focus());
}
</script>

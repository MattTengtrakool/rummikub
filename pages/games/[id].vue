<template>
  <div
    class="bg-body-bg h-dvh w-full flex flex-col items-center justify-center px-4"
    v-if="isUsernameBlank"
  >
    <div class="w-full max-w-xs flex flex-col items-center gap-6">
      <div class="flex flex-col items-center gap-2">
        <div class="size-12 rounded-full bg-separator flex items-center justify-center">
          <UserCircleIcon class="size-7 text-body-text-disabled" />
        </div>
        <h1 class="text-lg font-bold">Choose a username</h1>
      </div>

      <div class="w-full flex flex-col gap-3">
        <CInput
          v-model="tempUsername"
          placeholder="Username"
          @keydown.enter="!isTempUsername && saveUsername()"
        />
        <Button
          type="filled"
          class="w-full"
          :disabled="isTempUsername"
          @click="saveUsername()"
        >
          Join the game
        </Button>
      </div>
    </div>
  </div>
  <Game v-else />
</template>
<script setup lang="ts">
import { useLightMode } from "@/composables/useLightMode";
import { UserCircleIcon } from "@heroicons/vue/20/solid";

const tempUsername = ref("");
const isTempUsername = computed(() => isBlank(toValue(tempUsername)));

useLightMode();

useSeoMeta({
  title: "Game Room — Rummikub",
  robots: "noindex, nofollow",
});

const saveUsername = () => {
  username.value = tempUsername.value;
};
const { username, isUsernameBlank } = useUsername();
</script>

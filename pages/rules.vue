<template>
  <div class="mx-auto max-w-lg px-4 py-12 flex flex-col items-start">
    <NuxtLink to="/" class="mb-6 text-sm underline">
      {{ t("pages.rules.back_home") }}
    </NuxtLink>

    <h1 class="mb-6 text-3xl">
      {{ t("rules.title") }}
    </h1>

    <GameRules class="w-full" />
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: "Rules — Rummikub",
  description: "Learn how to play Rummikub: tile values, initial meld, table manipulation, and winning conditions.",
});
</script>
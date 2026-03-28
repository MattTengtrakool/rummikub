<template>
  <UModal :ui="{ background: 'bg-body-bg', width: 'sm:max-w-md' }">
    <div class="p-6 flex flex-col gap-6 max-h-[85vh] overflow-hidden">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-gray-100 flex items-center justify-center">
            <BookOpenIcon class="size-5 text-body-text-disabled" />
          </div>
          <h2 class="text-lg font-bold">{{ t("rules.title") }}</h2>
        </div>
        <button
          @click="modal.close()"
          class="size-8 rounded-lg flex items-center justify-center hover:bg-black/[0.04] transition-colors"
        >
          <XMarkIcon class="size-4 text-body-text-disabled" />
        </button>
      </div>

      <div class="overflow-y-auto -mx-1 px-1 flex flex-col gap-6 pb-1">

        <!-- Basics -->
        <div class="flex flex-col gap-3">
          <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.section.basics") }}</span>
          <div class="rounded-xl border border-separator bg-black/[0.01] px-3.5 py-3 flex flex-col gap-2.5">
            <div class="flex items-start gap-2.5">
              <TrophyIcon class="size-4 text-yellow-500 mt-0.5 shrink-0" />
              <p class="text-sm text-body-text/80">{{ t("rules.purpose.content") }}</p>
            </div>
            <div class="h-px bg-separator/40" />
            <div class="flex items-start gap-2.5">
              <UserGroupIcon class="size-4 text-blue-500 mt-0.5 shrink-0" />
              <p class="text-sm text-body-text/80">{{ t("rules.players_count.content") }}</p>
            </div>
          </div>
        </div>

        <!-- Tiles -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.section.tiles") }}</span>
          <div class="flex flex-col gap-1.5">
            <GameRuleSection :label="t('rules.card.title')" :default-open="defaultOpen === 'card'">
              <p class="text-sm text-body-text/80">{{ t("rules.card.content") }}</p>
              <div class="flex gap-2 justify-center pt-1">
                <Card color="red" :number="1" />
                <Card color="blue" :number="7" />
                <Card color="yellow" :number="8" />
                <Card color="black" :number="13" />
              </div>
            </GameRuleSection>

            <GameRuleSection :label="t('rules.joker.title')" :default-open="defaultOpen === 'joker'">
              <p class="text-sm text-body-text/80 whitespace-pre-wrap">{{ t("rules.joker.content") }}</p>
              <div class="flex gap-2 justify-center pt-1">
                <Card color="red" :number="0" />
                <Card color="black" :number="0" />
              </div>
            </GameRuleSection>
          </div>
        </div>

        <!-- Combinations -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.section.combinations") }}</span>
          <div class="flex flex-col gap-1.5">
            <GameRuleSection :label="t('rules.suite.title')" :default-open="defaultOpen === 'suite'">
              <p class="text-sm text-body-text/80">{{ t("rules.suite.content") }}</p>
              <div class="flex gap-2 justify-center pt-1">
                <Card color="red" :number="11" />
                <Card color="red" :number="12" />
                <Card color="red" :number="13" />
              </div>
            </GameRuleSection>

            <GameRuleSection :label="t('rules.serie.title')" :default-open="defaultOpen === 'serie'">
              <p class="text-sm text-body-text/80">{{ t("rules.serie.content") }}</p>
              <div class="flex gap-2 justify-center pt-1">
                <Card color="red" :number="11" />
                <Card color="blue" :number="11" />
                <Card color="yellow" :number="11" />
              </div>
            </GameRuleSection>
          </div>
        </div>

        <!-- Gameplay -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.section.gameplay") }}</span>
          <div class="flex flex-col gap-1.5">
            <GameRuleSection :label="t('rules.first_turn.title')" :default-open="defaultOpen === 'first_turn'">
              <p class="text-sm text-body-text/80 whitespace-pre-wrap">{{ t("rules.first_turn.content") }}</p>
              <div class="flex flex-col gap-3 pt-2">
                <p class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.first_turn.examples.title") }}</p>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-red-50/60 p-2.5">
                  <div class="flex gap-1">
                    <Card color="red" :number="9" />
                    <Card color="blue" :number="9" />
                    <Card color="yellow" :number="9" />
                  </div>
                  <p class="text-xs text-red-500 text-center">{{ t("rules.first_turn.examples.invalid") }}</p>
                </div>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-green-50/60 p-2.5">
                  <div class="flex gap-1">
                    <Card color="red" :number="11" />
                    <Card color="blue" :number="11" />
                    <Card color="yellow" :number="11" />
                  </div>
                  <p class="text-xs text-green-600 text-center">{{ t("rules.first_turn.examples.valid") }}</p>
                </div>
              </div>
            </GameRuleSection>

            <GameRuleSection :label="t('rules.turn.title')" :default-open="defaultOpen === 'turn'">
              <p class="text-sm text-body-text/80 whitespace-pre-wrap">{{ t("rules.turn.content") }}</p>
            </GameRuleSection>

            <GameRuleSection :label="t('rules.combination_modification.title')" :default-open="defaultOpen === 'combination_modification'">
              <p class="text-sm text-body-text/80 whitespace-pre-wrap">{{ t("rules.combination_modification.content") }}</p>
              <div class="flex flex-col gap-3 pt-2">
                <p class="text-xs font-medium text-body-text-disabled uppercase tracking-wider">{{ t("rules.combination_modification.examples.title") }}</p>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-black/[0.02] p-2.5">
                  <div class="flex gap-1">
                    <Card color="red" :number="11" />
                    <Card color="blue" :number="11" />
                    <Card color="yellow" :number="11" />
                  </div>
                  <p class="text-xs text-body-text-disabled text-center">{{ t("rules.combination_modification.examples.add") }}</p>
                </div>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-black/[0.02] p-2.5">
                  <div class="flex gap-1">
                    <Card color="red" :number="10" />
                    <Card color="red" :number="11" />
                    <Card color="red" :number="12" />
                    <Card color="red" :number="13" />
                  </div>
                  <p class="text-xs text-body-text-disabled text-center">{{ t("rules.combination_modification.examples.remove") }}</p>
                </div>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-black/[0.02] p-2.5">
                  <div class="flex gap-1">
                    <Card color="yellow" :number="3" />
                    <Card color="black" :number="0" />
                    <Card color="yellow" :number="5" />
                  </div>
                  <p class="text-xs text-body-text-disabled text-center">{{ t("rules.combination_modification.examples.replace") }}</p>
                </div>
                <div class="flex flex-col items-center gap-1 rounded-lg bg-black/[0.02] p-2.5">
                  <div class="flex gap-1">
                    <Card color="black" :number="5" />
                    <Card color="black" :number="6" />
                    <Card color="black" :number="7" />
                    <Card color="black" :number="8" />
                    <Card color="black" :number="9" />
                  </div>
                  <p class="text-xs text-body-text-disabled text-center">{{ t("rules.combination_modification.examples.split") }}</p>
                </div>
              </div>
            </GameRuleSection>
          </div>
        </div>

      </div>
    </div>
  </UModal>
</template>
<script setup lang="ts">
import { BookOpenIcon, XMarkIcon, TrophyIcon, UserGroupIcon } from "@heroicons/vue/20/solid";
import type { GameRule } from "@/utils/types/gamerule";

const props = withDefaults(
  defineProps<{
    defaultOpen?: GameRule;
  }>(),
  { defaultOpen: "purpose" },
);

const modal = useModal();
const { t } = useI18n();
</script>

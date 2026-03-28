import { localStorageKey } from "@/app/LocalStorage/infrastructure/constants";
import { useLocalStorage } from "@vueuse/core";

export type BoardTheme = "light" | "dark" | "green";
export type CardSize = "small" | "normal" | "large";

type Settings = {
  volume: number;
  muted: boolean;
  musicVolume: number;
  musicMuted: boolean;
  boardTheme: BoardTheme;
  cardSize: CardSize;
  showCursors: boolean;
  reduceAnimations: boolean;
};

const SETTINGS_KEY = localStorageKey("audio-settings");

const stored = useLocalStorage<Settings>(SETTINGS_KEY, {
  volume: 1,
  muted: false,
  musicVolume: 0.4,
  musicMuted: false,
  boardTheme: "light",
  cardSize: "normal",
  showCursors: true,
  reduceAnimations: false,
}, { mergeDefaults: true });

export function useSettings() {
  const volume = computed({
    get: () => stored.value.volume,
    set: (v: number) => { stored.value = { ...stored.value, volume: Math.max(0, Math.min(1, v)) }; },
  });

  const muted = computed({
    get: () => stored.value.muted,
    set: (v: boolean) => { stored.value = { ...stored.value, muted: v }; },
  });

  const effectiveVolume = computed(() => (muted.value ? 0 : volume.value));

  const toggleMute = () => { muted.value = !muted.value; };

  const musicVolume = computed({
    get: () => stored.value.musicVolume,
    set: (v: number) => { stored.value = { ...stored.value, musicVolume: Math.max(0, Math.min(1, v)) }; },
  });

  const musicMuted = computed({
    get: () => stored.value.musicMuted,
    set: (v: boolean) => { stored.value = { ...stored.value, musicMuted: v }; },
  });

  const effectiveMusicVolume = computed(() => (musicMuted.value ? 0 : musicVolume.value));

  const toggleMusicMute = () => { musicMuted.value = !musicMuted.value; };

  const boardTheme = computed({
    get: () => stored.value.boardTheme,
    set: (v: BoardTheme) => { stored.value = { ...stored.value, boardTheme: v }; },
  });

  const cardSize = computed({
    get: () => stored.value.cardSize,
    set: (v: CardSize) => { stored.value = { ...stored.value, cardSize: v }; },
  });

  const showCursors = computed({
    get: () => stored.value.showCursors,
    set: (v: boolean) => { stored.value = { ...stored.value, showCursors: v }; },
  });

  const reduceAnimations = computed({
    get: () => stored.value.reduceAnimations,
    set: (v: boolean) => { stored.value = { ...stored.value, reduceAnimations: v }; },
  });

  return {
    volume, muted, effectiveVolume, toggleMute,
    musicVolume, musicMuted, effectiveMusicVolume, toggleMusicMute,
    boardTheme, cardSize, showCursors, reduceAnimations,
  };
}

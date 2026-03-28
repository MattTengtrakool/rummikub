import { localStorageKey } from "@/app/LocalStorage/infrastructure/constants";
import { useLocalStorage } from "@vueuse/core";

type AudioSettings = {
  volume: number;
  muted: boolean;
};

const SETTINGS_KEY = localStorageKey("audio-settings");

const stored = useLocalStorage<AudioSettings>(SETTINGS_KEY, {
  volume: 1,
  muted: false,
});

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

  return { volume, muted, effectiveVolume, toggleMute };
}

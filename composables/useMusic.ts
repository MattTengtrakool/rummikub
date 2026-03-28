import { useSettings } from "@/composables/useSettings";

export type MusicTrack = "lobby" | "game";

const TRACK_FILES: Record<MusicTrack, string> = {
  lobby: "/sounds/music-lobby.mp3",
  game: "/sounds/music-game.mp3",
};

const TRACK_RATE: Partial<Record<MusicTrack, number>> = {
  game: 0.95,
};

const CROSSFADE_MS = 1500;
const FADE_STEP_MS = 50;

let activeAudio: HTMLAudioElement | null = null;
let activeTrack: MusicTrack | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;
let started = false;

function createAudio(track: MusicTrack): HTMLAudioElement {
  const audio = new Audio(TRACK_FILES[track]);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  audio.playbackRate = TRACK_RATE[track] ?? 1;
  return audio;
}

function fadeOut(audio: HTMLAudioElement, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startVol = audio.volume;
    if (startVol === 0) {
      audio.pause();
      resolve();
      return;
    }
    const steps = Math.ceil(durationMs / FADE_STEP_MS);
    const decrement = startVol / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol - decrement * step);
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.volume = 0;
        resolve();
      }
    }, FADE_STEP_MS);
  });
}

function fadeIn(audio: HTMLAudioElement, targetVolume: number, durationMs: number) {
  if (fadeInterval) clearInterval(fadeInterval);
  const steps = Math.ceil(durationMs / FADE_STEP_MS);
  const increment = targetVolume / steps;
  let step = 0;
  audio.volume = 0;
  fadeInterval = setInterval(() => {
    step++;
    audio.volume = Math.min(targetVolume, increment * step);
    if (step >= steps) {
      clearInterval(fadeInterval!);
      fadeInterval = null;
    }
  }, FADE_STEP_MS);
}

export function useMusic() {
  const { effectiveMusicVolume } = useSettings();

  watch(effectiveMusicVolume, (vol) => {
    if (activeAudio && !fadeInterval) {
      activeAudio.volume = vol;
    }
  });

  const play = (track: MusicTrack) => {
    if (activeTrack === track && activeAudio && !activeAudio.paused) return;

    const targetVol = effectiveMusicVolume.value;

    if (activeAudio) {
      const old = activeAudio;
      fadeOut(old, CROSSFADE_MS);
    }

    const audio = createAudio(track);
    activeAudio = audio;
    activeTrack = track;
    started = true;

    audio.play().then(() => {
      fadeIn(audio, targetVol, CROSSFADE_MS);
    }).catch(() => {
      // Autoplay blocked — will retry on user interaction
    });
  };

  const stop = () => {
    if (activeAudio) {
      fadeOut(activeAudio, CROSSFADE_MS);
      activeAudio = null;
      activeTrack = null;
      started = false;
    }
  };

  const resume = () => {
    if (activeAudio && activeAudio.paused && started) {
      const vol = effectiveMusicVolume.value;
      activeAudio.play().then(() => {
        activeAudio!.volume = vol;
      }).catch(() => {});
    }
  };

  const isPlaying = computed(() => activeAudio !== null && !activeAudio.paused);

  return { play, stop, resume, isPlaying };
}

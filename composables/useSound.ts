const EXTENSIONS = ["mp3", "wav"] as const;
const sounds = new Map<string, HTMLAudioElement>();
const failed = new Set<string>();
const loading = new Map<string, Promise<HTMLAudioElement>>();

function resolveAudio(name: string, extIndex = 0): Promise<HTMLAudioElement> {
  if (extIndex >= EXTENSIONS.length) {
    failed.add(name);
    return Promise.reject();
  }
  const audio = new Audio(`/sounds/${name}.${EXTENSIONS[extIndex]}`);
  audio.preload = "auto";
  return new Promise<HTMLAudioElement>((resolve, reject) => {
    audio.addEventListener("canplaythrough", () => resolve(audio), { once: true });
    audio.addEventListener("error", () => reject(), { once: true });
  }).catch(() => resolveAudio(name, extIndex + 1));
}

function preload(name: string): void {
  if (sounds.has(name) || failed.has(name) || loading.has(name)) return;
  const promise = resolveAudio(name).then((audio) => {
    sounds.set(name, audio);
    loading.delete(name);
    return audio;
  }).catch(() => { loading.delete(name); }) as Promise<HTMLAudioElement>;
  loading.set(name, promise);
}

const ALL_SOUNDS = [
  "button-click",
  "card-place",
  "card-place-opponent",
  "card-draw",
  "your-turn",
  "game-start",
  "game-end",
  "game-end-lose",
  "timer-tick",
  "timer-up",
];

let preloaded = false;

export function useSound() {
  if (!preloaded && typeof window !== "undefined") {
    preloaded = true;
    ALL_SOUNDS.forEach(preload);
  }

  const play = (name: string, volume = 1) => {
    if (failed.has(name)) return;

    const cached = sounds.get(name);
    if (cached) {
      const clone = cached.cloneNode() as HTMLAudioElement;
      clone.volume = volume;
      clone.play().catch(() => {});
      return;
    }

    preload(name);
    const pending = loading.get(name);
    if (pending) {
      pending.then((audio) => {
        if (!audio) return;
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = volume;
        clone.play().catch(() => {});
      }).catch(() => {});
    }
  };
  return { play };
}

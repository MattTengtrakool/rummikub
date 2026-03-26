const EXTENSIONS = ["mp3", "wav"] as const;
const sounds = new Map<string, HTMLAudioElement>();
const failed = new Set<string>();

function resolveAudio(name: string, extIndex = 0): Promise<HTMLAudioElement> {
  if (extIndex >= EXTENSIONS.length) {
    failed.add(name);
    return Promise.reject();
  }
  const audio = new Audio(`/sounds/${name}.${EXTENSIONS[extIndex]}`);
  return new Promise((resolve, reject) => {
    audio.addEventListener("canplaythrough", () => resolve(audio), { once: true });
    audio.addEventListener("error", () => reject(), { once: true });
  }).catch(() => resolveAudio(name, extIndex + 1)) as Promise<HTMLAudioElement>;
}

export function useSound() {
  const play = (name: string, volume = 1) => {
    if (failed.has(name)) return;

    const cached = sounds.get(name);
    if (cached) {
      cached.volume = volume;
      cached.currentTime = 0;
      cached.play().catch(() => {});
      return;
    }

    resolveAudio(name).then((audio) => {
      sounds.set(name, audio);
      audio.volume = volume;
      audio.play().catch(() => {});
    }).catch(() => {});
  };
  return { play };
}

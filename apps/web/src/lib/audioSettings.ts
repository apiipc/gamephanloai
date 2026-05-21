const SFX_VOL_KEY = 'game-sfx-volume';
const MUSIC_VOL_KEY = 'game-music-volume';

/** Mặc định cao hơn vì SFX tổng hợp nghe nhỏ */
export const DEFAULT_SFX_VOLUME = 0.92;
export const DEFAULT_MUSIC_VOLUME = 0.55;

const listeners = new Set<() => void>();

function readNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  } catch {
    return fallback;
  }
}

function writeNum(key: string, value: number) {
  try {
    localStorage.setItem(key, String(Math.min(1, Math.max(0, value))));
  } catch {
    /* ignore */
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function getSfxVolume(): number {
  return readNum(SFX_VOL_KEY, DEFAULT_SFX_VOLUME);
}

export function setSfxVolume(value: number): void {
  writeNum(SFX_VOL_KEY, value);
  notify();
}

export function getMusicVolume(): number {
  return readNum(MUSIC_VOL_KEY, DEFAULT_MUSIC_VOLUME);
}

export function setMusicVolume(value: number): void {
  writeNum(MUSIC_VOL_KEY, value);
  notify();
}

export function subscribeAudioSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function formatVolumePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

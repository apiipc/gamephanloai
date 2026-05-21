import { getMusicVolume } from './audioSettings';

/** Nhạc nền chung cho mọi mini game */
export const BGM_URL = '/music/Jumping_Over_Puddles.mp3';
export const BGM_TITLE = 'Jumping Over Puddles';

const ENABLED_KEY = 'game-sound-enabled';

export type GameMusicId = 'sort' | 'quiz' | 'wheel';

let bgmAudio: HTMLAudioElement | null = null;
let isPlaying = false;

function isSoundEnabledLocal(): boolean {
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

function getBgmElement(): HTMLAudioElement {
  if (!bgmAudio) {
    bgmAudio = new Audio(BGM_URL);
    bgmAudio.loop = true;
    bgmAudio.preload = 'auto';
  }
  return bgmAudio;
}

export function applyMusicVolume(forceAudible = false): void {
  const el = bgmAudio;
  if (!el) return;
  const audible = forceAudible || isSoundEnabledLocal();
  el.volume = audible ? getMusicVolume() : 0;
}

async function playBgm(forcePreview = false): Promise<void> {
  if (!forcePreview && !isSoundEnabledLocal()) return;
  const el = getBgmElement();
  applyMusicVolume(forcePreview);
  try {
    await el.play();
    isPlaying = true;
  } catch {
    isPlaying = false;
  }
}

/** Bắt đầu nhạc nền (cùng một track cho mọi game) */
export function startGameMusic(_id?: GameMusicId): void {
  if (isPlaying) {
    applyMusicVolume();
    return;
  }
  void playBgm(false);
}

/** Nghe thử nhạc nền */
export function previewGameMusic(_id?: GameMusicId): void {
  void playBgm(true);
}

export function stopGameMusic(): void {
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
  isPlaying = false;
}

export function isGameMusicPlaying(): boolean {
  return isPlaying && Boolean(bgmAudio && !bgmAudio.paused);
}

import bgmSrc from '../assets/music/Jumping_Over_Puddles.mp3';
import { getMusicVolume } from './audioSettings';

/** URL do Vite bundle — luôn có trong `dist/assets/` khi deploy */
export const BGM_URL = bgmSrc;
export const BGM_TITLE = 'Jumping Over Puddles';

const ENABLED_KEY = 'game-sound-enabled';

export type GameMusicId = 'sort' | 'quiz' | 'wheel';

let bgmAudio: HTMLAudioElement | null = null;
let isPlaying = false;
let wantsPlay = false;
let loadError = false;

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
    bgmAudio.addEventListener('error', () => {
      loadError = true;
      console.warn('[BGM] Không tải được file nhạc:', BGM_URL);
    });
  }
  return bgmAudio;
}

export function applyMusicVolume(forceAudible = false): void {
  const el = bgmAudio;
  if (!el) return;
  const audible = forceAudible || isSoundEnabledLocal();
  el.volume = audible ? getMusicVolume() : 0;
  el.muted = !audible;
}

async function tryPlay(forcePreview = false): Promise<boolean> {
  if (loadError) return false;
  if (!forcePreview && !isSoundEnabledLocal()) {
    wantsPlay = false;
    return false;
  }

  const el = getBgmElement();
  applyMusicVolume(forcePreview);

  try {
    await el.play();
    isPlaying = true;
    wantsPlay = !forcePreview;
    return true;
  } catch {
    isPlaying = false;
    wantsPlay = !forcePreview;
    return false;
  }
}

/** Gọi sau thao tác chạm/click (mở khóa autoplay trình duyệt) */
export function unlockBgmFromGesture(): void {
  if (!wantsPlay) return;
  void tryPlay(false);
}

/** Đánh dấu cần phát nhạc nền — thử ngay, nếu bị chặn sẽ phát sau lần chạm tiếp theo */
export function startGameMusic(_id?: GameMusicId): void {
  if (!isSoundEnabledLocal()) return;
  wantsPlay = true;
  if (isPlaying) {
    applyMusicVolume();
    return;
  }
  void tryPlay(false);
}

export function previewGameMusic(_id?: GameMusicId): void {
  wantsPlay = true;
  void tryPlay(true);
}

export function stopGameMusic(): void {
  wantsPlay = false;
  if (!bgmAudio) return;
  bgmAudio.pause();
  try {
    bgmAudio.currentTime = 0;
  } catch {
    /* ignore */
  }
  isPlaying = false;
}

export function isGameMusicPlaying(): boolean {
  return isPlaying && Boolean(bgmAudio && !bgmAudio.paused);
}

export function isBgmLoadError(): boolean {
  return loadError;
}

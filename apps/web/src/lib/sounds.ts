/**
 * Âm thanh game — Web Audio API (không cần file MP3).
 * Bật/tắt lưu localStorage; cần tương tác người dùng để mở khóa autoplay.
 */

export type GameSound =
  | 'correct'
  | 'wrong'
  | 'pickup'
  | 'tick'
  | 'timeout'
  | 'finish'
  | 'spin'
  | 'win'
  | 'combo'
  | 'click';

const STORAGE_KEY = 'game-sound-enabled';

let ctx: AudioContext | null = null;
let unlocked = false;

function readEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

let enabled = readEnabled();

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function tone(
  frequency: number,
  duration: number,
  opts?: { type?: OscillatorType; gain?: number; when?: number; slideTo?: number },
) {
  const audio = getCtx();
  if (!audio) return;
  const when = opts?.when ?? audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = opts?.type ?? 'sine';
  osc.frequency.setValueAtTime(frequency, when);
  if (opts?.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.slideTo, 1), when + duration);
  }
  const peak = opts?.gain ?? 0.22;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function chord(notes: number[], duration: number, gain = 0.14) {
  const audio = getCtx();
  if (!audio) return;
  const when = audio.currentTime;
  notes.forEach((freq, i) => {
    tone(freq, duration, { gain, when: when + i * 0.05 });
  });
}

const PLAYERS: Record<GameSound, () => void> = {
  correct: () => chord([523.25, 659.25, 783.99], 0.28, 0.16),
  wrong: () => tone(180, 0.22, { type: 'square', gain: 0.1, slideTo: 120 }),
  pickup: () => tone(440, 0.06, { gain: 0.12 }),
  tick: () => tone(880, 0.04, { gain: 0.08 }),
  timeout: () => tone(330, 0.2, { type: 'triangle', gain: 0.12, slideTo: 200 }),
  finish: () => chord([392, 523.25, 659.25, 783.99], 0.45, 0.18),
  win: () => chord([523.25, 659.25, 783.99, 1046.5], 0.55, 0.2),
  spin: () => {
    const audio = getCtx();
    if (!audio) return;
    const when = audio.currentTime;
    for (let i = 0; i < 6; i++) {
      tone(200 + i * 40, 0.05, { type: 'triangle', gain: 0.06, when: when + i * 0.07 });
    }
  },
  combo: () => chord([659.25, 880, 1046.5], 0.2, 0.15),
  click: () => tone(600, 0.03, { gain: 0.07 }),
};

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (!on && ctx) {
    void ctx.suspend();
  } else if (on && ctx) {
    void ctx.resume();
  }
}

/** Gọi sau lần chạm/click đầu tiên để trình duyệt cho phát âm thanh */
export function unlockAudio(): void {
  if (unlocked) return;
  const audio = getCtx();
  if (!audio) return;
  unlocked = true;
  void audio.resume();
}

export function playSound(id: GameSound): void {
  if (!enabled) return;
  try {
    PLAYERS[id]?.();
  } catch {
    /* ignore — một số trình duyệt chặn audio */
  }
}

/** Gắn một lần trên document để mở khóa audio */
export function installSoundUnlock(): () => void {
  const onFirst = () => {
    unlockAudio();
    document.removeEventListener('pointerdown', onFirst, true);
    document.removeEventListener('keydown', onFirst, true);
  };
  document.addEventListener('pointerdown', onFirst, true);
  document.addEventListener('keydown', onFirst, true);
  return () => {
    document.removeEventListener('pointerdown', onFirst, true);
    document.removeEventListener('keydown', onFirst, true);
  };
}

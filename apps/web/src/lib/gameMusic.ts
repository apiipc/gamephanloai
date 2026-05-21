import { getAudioContext, isSoundEnabled, unlockAudio } from './sounds';

export type GameMusicId = 'sort' | 'quiz' | 'wheel';

export interface GameMusicCatalogItem {
  id: GameMusicId;
  label: string;
  hint: string;
}

export const GAME_MUSIC_CATALOG: GameMusicCatalogItem[] = [
  { id: 'sort', label: 'Phân loại siêu tốc', hint: 'Nhịp vui, giai điệu xanh — kéo rác' },
  { id: 'quiz', label: 'Quiz môi trường', hint: 'Êm, tập trung — suy nghĩ từng câu' },
  { id: 'wheel', label: 'Vòng quay xanh', hint: 'Sôi động — chờ trúng thưởng' },
];

const MUSIC_GAIN = 0.1;
const FADE_SEC = 0.6;

let musicBus: GainNode | null = null;
let stopLoop: (() => void) | null = null;
let currentId: GameMusicId | null = null;

function getBus(ctx: AudioContext): GainNode {
  if (!musicBus || musicBus.context !== ctx) {
    musicBus = ctx.createGain();
    musicBus.connect(ctx.destination);
  }
  return musicBus;
}

function fadeBus(bus: GainNode, to: number, when: number, duration = FADE_SEC) {
  bus.gain.cancelScheduledValues(when);
  bus.gain.setValueAtTime(bus.gain.value, when);
  bus.gain.linearRampToValueAtTime(to, when + duration);
}

function note(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  at: number,
  dur: number,
  opts?: { type?: OscillatorType; vol?: number },
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const vol = opts?.vol ?? 0.2;
  osc.type = opts?.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function chordPad(
  ctx: AudioContext,
  dest: AudioNode,
  freqs: number[],
  at: number,
  hold: number,
) {
  freqs.forEach((f, i) => {
    note(ctx, dest, f, at + i * 0.02, hold, { type: 'sine', vol: 0.06 });
  });
}

function loopSort(ctx: AudioContext, dest: AudioNode): () => void {
  const melody = [523.25, 659.25, 783.99, 659.25, 523.25, 440, 523.25, 392];
  let step = 0;
  let stopped = false;
  const ms = 360;
  const id = window.setInterval(() => {
    if (stopped || !isSoundEnabled()) return;
    const t = ctx.currentTime + 0.04;
    note(ctx, dest, melody[step % melody.length], t, 0.28, { type: 'triangle', vol: 0.14 });
    if (step % 4 === 0) note(ctx, dest, 196, t, 0.45, { type: 'sine', vol: 0.07 });
    step += 1;
  }, ms);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}

function loopQuiz(ctx: AudioContext, dest: AudioNode): () => void {
  const chords: number[][] = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [261.63, 329.63, 392],
    [196, 246.94, 293.66],
  ];
  let step = 0;
  let stopped = false;
  const ms = 2200;
  const tick = () => {
    if (stopped || !isSoundEnabled()) return;
    chordPad(ctx, dest, chords[step % chords.length], ctx.currentTime + 0.05, 1.8);
    step += 1;
  };
  tick();
  const id = window.setInterval(tick, ms);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}

function loopWheel(ctx: AudioContext, dest: AudioNode): () => void {
  const bounce = [392, 523.25, 659.25, 523.25, 440, 523.25, 587.33, 659.25];
  let step = 0;
  let stopped = false;
  const ms = 280;
  const id = window.setInterval(() => {
    if (stopped || !isSoundEnabled()) return;
    const t = ctx.currentTime + 0.03;
    note(ctx, dest, bounce[step % bounce.length], t, 0.22, { type: 'square', vol: 0.09 });
    if (step % 2 === 0) note(ctx, dest, 130.81, t, 0.18, { type: 'triangle', vol: 0.06 });
    step += 1;
  }, ms);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}

const LOOPS: Record<GameMusicId, (ctx: AudioContext, dest: AudioNode) => () => void> = {
  sort: loopSort,
  quiz: loopQuiz,
  wheel: loopWheel,
};

function beginLoop(id: GameMusicId, forcePreview = false): void {
  if (!forcePreview && !isSoundEnabled()) return;
  unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const bus = getBus(ctx);
  fadeBus(bus, forcePreview ? MUSIC_GAIN : MUSIC_GAIN, ctx.currentTime, 0.4);
  stopLoop = LOOPS[id](ctx, bus);
  currentId = id;
}

/** Bắt đầu nhạc nền theo game (dừng track cũ nếu có) */
export function startGameMusic(id: GameMusicId): void {
  if (currentId === id && stopLoop) return;
  stopGameMusic();
  beginLoop(id);
}

/** Nghe thử nhạc nền (trang demo — không cần bật âm thanh game) */
export function previewGameMusic(id: GameMusicId): void {
  stopGameMusic();
  beginLoop(id, true);
}

export function stopGameMusic(): void {
  stopLoop?.();
  stopLoop = null;
  currentId = null;
  const ctx = getAudioContext();
  if (ctx && musicBus) {
    try {
      musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    } catch {
      /* ignore */
    }
  }
}

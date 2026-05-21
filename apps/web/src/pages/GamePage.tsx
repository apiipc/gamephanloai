import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameViewport } from '../components/GameViewport';
import { TrashItemView } from '../components/TrashItemView';
import { gameApi } from '../api/client';
import { GameAudioHud } from '../components/GameAudioHud';
import { useGameMusic } from '../hooks/useGameMusic';
import { playSound } from '../lib/sounds';
import type { GameSession, TrashCategory, TrashItem } from '../types';
import { BIN_IMAGES } from '../types';

const BIN_CATEGORIES: TrashCategory[] = ['ORGANIC', 'RECYCLE', 'OTHER'];

const BINS: { category: TrashCategory; label: string }[] = [
  { category: 'ORGANIC', label: 'HỮU CƠ' },
  { category: 'RECYCLE', label: 'TÁI CHẾ' },
  { category: 'OTHER', label: 'KHÁC' },
];

const HIT_PAD = 20;

function pickRandom(items: TrashItem[], excludeId?: string): TrashItem {
  const pool = excludeId ? items.filter((i) => i.id !== excludeId) : items;
  return pool[Math.floor(Math.random() * pool.length)] ?? items[0];
}

function getTimeLeft(sess: GameSession): number {
  const elapsed = Math.floor((Date.now() - new Date(sess.startedAt).getTime()) / 1000);
  return Math.max(0, sess.durationSec - elapsed);
}

function hitTestBin(
  x: number,
  y: number,
  refs: Record<TrashCategory, HTMLDivElement | null>,
): TrashCategory | null {
  for (const cat of BIN_CATEGORIES) {
    const el = refs[cat];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (
      x >= r.left - HIT_PAD &&
      x <= r.right + HIT_PAD &&
      y >= r.top - HIT_PAD &&
      y <= r.bottom + HIT_PAD
    ) {
      return cat;
    }
  }
  return null;
}

export default function GamePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [current, setCurrent] = useState<TrashItem | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<TrashCategory | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finishedRef = useRef(false);
  const processingRef = useRef(false);
  const prevTimeLeftRef = useRef(45);
  const draggingRef = useRef(false);
  const sessionRef = useRef<GameSession | null>(null);
  const currentRef = useRef<TrashItem | null>(null);
  const itemsRef = useRef<TrashItem[]>([]);
  const binRefs = useRef<Record<TrashCategory, HTMLDivElement | null>>({
    ORGANIC: null,
    RECYCLE: null,
    OTHER: null,
  });

  sessionRef.current = session;
  currentRef.current = current;
  itemsRef.current = items;

  useGameMusic('sort', Boolean(session && current));

  useEffect(() => {
    (async () => {
      const [trashItems, sess] = await Promise.all([
        gameApi.getItems(),
        gameApi.startSession(45),
      ]);
      setItems(trashItems);
      setSession(sess);
      setCurrent(pickRandom(trashItems));
      setTimeLeft(getTimeLeft(sess));
    })().catch(() => navigate('/play'));
  }, [navigate]);

  const finishGame = useCallback(async () => {
    if (finishedRef.current || !sessionRef.current) return;
    finishedRef.current = true;
    playSound('finish');
    try {
      const result = await gameApi.finish(sessionRef.current.id);
      navigate('/result', {
        state: {
          score: result.score,
          correctCount: result.correctCount,
          totalCount: result.totalCount,
          bonus: result.bonus,
        },
      });
    } catch {
      navigate('/play');
    }
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const sess = sessionRef.current;
      if (!sess) return;
      const left = getTimeLeft(sess);
      if (left <= 5 && left < prevTimeLeftRef.current) {
        playSound('tick');
      }
      prevTimeLeftRef.current = left;
      setTimeLeft(left);
      if (left <= 0) finishGame();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, finishGame]);

  const handleDrop = useCallback(async (bin: TrashCategory) => {
    const sess = sessionRef.current;
    const item = currentRef.current;
    if (!sess || !item || processingRef.current) return;

    processingRef.current = true;
    setErrorMsg(null);
    setDragOver(null);
    setIsDragging(false);
    setGhostPos(null);
    draggingRef.current = false;

    try {
      const res = await gameApi.answer(sess.id, item.id, bin);
      setSession(res.session);
      playSound(res.isCorrect ? 'correct' : 'wrong');
      setFeedback({
        type: res.isCorrect ? 'correct' : 'wrong',
        text: res.isCorrect ? 'CHÍNH XÁC! +10 điểm' : 'SAI RỒI! -5 điểm',
      });
      setTimeout(() => {
        setFeedback(null);
        setCurrent(pickRandom(itemsRef.current, item.id));
        processingRef.current = false;
      }, 900);
    } catch (err) {
      processingRef.current = false;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Hết giờ') || msg.includes('đã kết thúc')) {
        finishGame();
        return;
      }
      setErrorMsg(msg || 'Không gửi được đáp án');
    }
  }, [finishGame]);

  const endDragListeners = useRef<(() => void) | null>(null);

  useEffect(() => () => endDragListeners.current?.(), []);

  const startDrag = (clientX: number, clientY: number) => {
    if (processingRef.current || feedback) return;
    playSound('pickup');
    draggingRef.current = true;
    setIsDragging(true);
    setGhostPos({ x: clientX, y: clientY });

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setGhostPos({ x: e.clientX, y: e.clientY });
      setDragOver(hitTestBin(e.clientX, e.clientY, binRefs.current));
    };

    const onEnd = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      const bin = hitTestBin(e.clientX, e.clientY, binRefs.current);
      setGhostPos(null);
      setDragOver(null);
      cleanup();
      if (bin) handleDrop(bin);
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
    endDragListeners.current = cleanup;
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!session || !current) {
    return (
      <GameViewport>
      <div className="app-shell app-shell--game">
        <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
          Đang chuẩn bị game...
        </div>
      </div>
      </GameViewport>
    );
  }

  return (
    <GameViewport>
    <div className="app-shell app-shell--game">
      <div
        className="page game-page"
        style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 40px)' }}
      >
        <div className="game-hud">
          <span className="game-hud-pill">⏱ {formatTime(timeLeft)}</span>
          <span className="game-hud-pill game-hud-pill--score">⭐ {session.score}</span>
          <GameAudioHud className="game-hud__sound" />
        </div>

        <p className="game-instruction">KÉO RÁC VÀO THÙNG PHÙ HỢP</p>

        {errorMsg && <p className="error-msg" style={{ textAlign: 'center' }}>{errorMsg}</p>}

        <div
          className={`trash-item ${isDragging ? 'dragging' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
          }}
        >
          <TrashItemView item={current} size="play" />
          <p className="trash-item-name">{current.name}</p>
        </div>

        {isDragging && ghostPos && (
          <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }}>
            <TrashItemView item={current} size="ghost" />
          </div>
        )}

        <div className="bins-row">
          {BINS.map((bin) => (
            <div
              key={bin.category}
              ref={(el) => {
                binRefs.current[bin.category] = el;
              }}
              data-bin={bin.category}
              className={`bin ${dragOver === bin.category ? 'drag-over' : ''}`}
              onClick={() => {
                if (!feedback && !draggingRef.current) handleDrop(bin.category);
              }}
              role="button"
              tabIndex={0}
            >
              <img
                src={BIN_IMAGES[bin.category]}
                alt={bin.label}
                className="bin-img"
                draggable={false}
              />
              <span className="bin-label">{bin.label}</span>
            </div>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="feedback-overlay">
          <div className={`feedback-box ${feedback.type}`}>
            {feedback.type === 'correct' ? '✅' : '❌'}
            <p>{feedback.text}</p>
          </div>
        </div>
      )}
    </div>
    </GameViewport>
  );
}

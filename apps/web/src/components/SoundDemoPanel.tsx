import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { stopGameMusic } from '../lib/gameMusic';
import {
  isSoundEnabled,
  playAllSoundPreviews,
  playSoundPreview,
  SOUND_CATALOG,
  type GameSound,
  type SoundCatalogItem,
} from '../lib/sounds';
import { AudioVolumeControls } from './AudioVolumeControls';
import { SoundToggle } from './SoundToggle';

const GAME_ORDER = ['Phân loại', 'Quiz', 'Vòng quay', 'Chung'] as const;

function groupByGame(): Map<string, SoundCatalogItem[]> {
  const map = new Map<string, SoundCatalogItem[]>();
  for (const g of GAME_ORDER) map.set(g, []);
  for (const item of SOUND_CATALOG) {
    const list = map.get(item.game) ?? [];
    list.push(item);
    map.set(item.game, list);
  }
  return map;
}

export function SoundDemoPanel({ showBackLink = true }: { showBackLink?: boolean }) {
  const [playingId, setPlayingId] = useState<GameSound | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const cancelAllRef = useRef(false);

  const playOne = (id: SoundCatalogItem['id']) => {
    setPlayingId(id);
    playSoundPreview(id);
    window.setTimeout(() => setPlayingId((cur) => (cur === id ? null : cur)), 400);
  };

  const playAll = async () => {
    cancelAllRef.current = false;
    setPlayingAll(true);
    try {
      await playAllSoundPreviews(
        (item) => setPlayingId(item.id),
        750,
        () => !cancelAllRef.current,
      );
    } finally {
      setPlayingId(null);
      setPlayingAll(false);
    }
  };

  const stopAll = () => {
    cancelAllRef.current = true;
    setPlayingAll(false);
    setPlayingId(null);
    stopGameMusic();
  };

  const grouped = groupByGame();

  return (
    <div className="sound-demo">
      {showBackLink && (
        <Link to="/profile" className="sound-demo__back">
          ← Hồ sơ
        </Link>
      )}

      <div className="sound-demo__head">
        <div>
          <h2 className="sound-demo__title">🔊 Nghe thử âm thanh</h2>
          <p className="sound-demo__desc">
            Chỉnh âm lượng hiệu ứng & nhạc nền MP3. Demo SFX luôn phát được kể cả khi đã tắt âm
            thanh game.
          </p>
        </div>
        <SoundToggle showLabel />
      </div>

      {!isSoundEnabled() && (
        <p className="sound-demo__note">
          Âm thanh trong game đang <strong>tắt</strong> — bật 🔊 ở trên nếu muốn nghe khi chơi
          thật.
        </p>
      )}

      <section className="sound-demo__group sound-demo__group--music">
        <h3 className="sound-demo__group-title">🎵 Âm lượng</h3>
        <AudioVolumeControls showMusicPreview />
      </section>

      <div className="sound-demo__actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={playingAll}
          onClick={() => void playAll()}
        >
          ▶ Phát tất cả hiệu ứng
        </button>
        {playingAll && (
          <button type="button" className="btn btn-secondary" onClick={stopAll}>
            Dừng
          </button>
        )}
      </div>

      <h3 className="sound-demo__section-label">Hiệu ứng (SFX)</h3>

      {GAME_ORDER.map((game) => {
        const items = grouped.get(game) ?? [];
        if (!items.length) return null;
        return (
          <section key={game} className="sound-demo__group">
            <h3 className="sound-demo__group-title">{game}</h3>
            <ul className="sound-demo__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`sound-demo__item ${playingId === item.id ? 'sound-demo__item--active' : ''}`}
                    onClick={() => playOne(item.id)}
                    disabled={playingAll}
                  >
                    <span className="sound-demo__play" aria-hidden>
                      {playingId === item.id ? '♪' : '▶'}
                    </span>
                    <span className="sound-demo__item-text">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

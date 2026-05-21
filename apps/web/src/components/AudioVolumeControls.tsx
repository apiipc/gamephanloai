import { useEffect, useState } from 'react';
import {
  formatVolumePercent,
  getMusicVolume,
  getSfxVolume,
  setMusicVolume,
  setSfxVolume,
  subscribeAudioSettings,
} from '../lib/audioSettings';
import {
  BGM_TITLE,
  isGameMusicPlaying,
  previewGameMusic,
  stopGameMusic,
} from '../lib/gameMusic';
import { playSoundPreview } from '../lib/sounds';

interface AudioVolumeControlsProps {
  /** Hiển thị nút nghe thử nhạc nền */
  showMusicPreview?: boolean;
  compact?: boolean;
}

export function AudioVolumeControls({
  showMusicPreview = false,
  compact = false,
}: AudioVolumeControlsProps) {
  const [sfx, setSfx] = useState(getSfxVolume);
  const [music, setMusic] = useState(getMusicVolume);
  const [bgmOn, setBgmOn] = useState(false);

  useEffect(() => {
    return subscribeAudioSettings(() => {
      setSfx(getSfxVolume());
      setMusic(getMusicVolume());
    });
  }, []);

  useEffect(() => {
    if (!bgmOn) return;
    const t = window.setInterval(() => {
      if (!isGameMusicPlaying()) setBgmOn(false);
    }, 400);
    return () => clearInterval(t);
  }, [bgmOn]);

  const onSfxChange = (pct: number) => {
    const v = pct / 100;
    setSfx(v);
    setSfxVolume(v);
    playSoundPreview('click');
  };

  const onMusicChange = (pct: number) => {
    const v = pct / 100;
    setMusic(v);
    setMusicVolume(v);
  };

  const toggleBgmPreview = () => {
    if (bgmOn) {
      stopGameMusic();
      setBgmOn(false);
    } else {
      previewGameMusic();
      setBgmOn(true);
    }
  };

  return (
    <div className={`audio-vol ${compact ? 'audio-vol--compact' : ''}`}>
      <label className="audio-vol__row">
        <span className="audio-vol__label">
          Hiệu ứng (SFX) <strong>{formatVolumePercent(sfx)}</strong>
        </span>
        <input
          type="range"
          className="audio-vol__range"
          min={0}
          max={100}
          value={Math.round(sfx * 100)}
          onChange={(e) => onSfxChange(Number(e.target.value))}
          aria-label="Âm lượng hiệu ứng"
        />
      </label>

      <label className="audio-vol__row">
        <span className="audio-vol__label">
          Nhạc nền <strong>{formatVolumePercent(music)}</strong>
        </span>
        <input
          type="range"
          className="audio-vol__range"
          min={0}
          max={100}
          value={Math.round(music * 100)}
          onChange={(e) => onMusicChange(Number(e.target.value))}
          aria-label="Âm lượng nhạc nền"
        />
      </label>

      {showMusicPreview && (
        <p className="audio-vol__bgm-hint">
          Track: <em>{BGM_TITLE}</em> — dùng chung cả 3 game
        </p>
      )}

      {showMusicPreview && (
        <button type="button" className="btn btn-secondary audio-vol__preview-btn" onClick={toggleBgmPreview}>
          {bgmOn ? '⏸ Dừng nhạc nền' : '▶ Nghe thử nhạc nền'}
        </button>
      )}
    </div>
  );
}

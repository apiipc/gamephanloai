import { useState } from 'react';
import { AudioVolumeControls } from './AudioVolumeControls';
import { SoundToggle } from './SoundToggle';

interface GameAudioHudProps {
  className?: string;
}

/** HUD trong game: bật/tắt + chỉnh âm lượng SFX & nhạc nền */
export function GameAudioHud({ className = '' }: GameAudioHudProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`game-audio-hud ${className}`.trim()}>
      <div className="game-audio-hud__top">
        <SoundToggle />
        <button
          type="button"
          className="game-audio-hud__vol-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Điều chỉnh âm lượng"
          title="Âm lượng"
        >
          🎚
        </button>
      </div>
      {open && (
        <div className="game-audio-hud__panel">
          <AudioVolumeControls compact />
        </div>
      )}
    </div>
  );
}

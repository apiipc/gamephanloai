import { useEffect, useState } from 'react';
import { isSoundEnabled, playSound, setSoundEnabled, unlockAudio } from '../lib/sounds';

interface SoundToggleProps {
  className?: string;
  /** Nhãn ngắn bên cạnh (tuỳ chọn) */
  showLabel?: boolean;
}

export function SoundToggle({ className = '', showLabel = false }: SoundToggleProps) {
  const [on, setOn] = useState(isSoundEnabled);

  useEffect(() => {
    setOn(isSoundEnabled());
  }, []);

  const toggle = () => {
    unlockAudio();
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
    if (next) playSound('click');
  };

  return (
    <button
      type="button"
      className={`sound-toggle ${className}`.trim()}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Tắt âm thanh' : 'Bật âm thanh'}
      title={on ? 'Tắt âm thanh' : 'Bật âm thanh'}
    >
      <span className="sound-toggle__icon" aria-hidden>
        {on ? '🔊' : '🔇'}
      </span>
      {showLabel && <span className="sound-toggle__label">{on ? 'Bật' : 'Tắt'}</span>}
    </button>
  );
}

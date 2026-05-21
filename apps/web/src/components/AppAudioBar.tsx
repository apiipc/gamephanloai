import { useAuth } from '../context/AuthContext';
import { AudioVolumeControls } from './AudioVolumeControls';
import { SoundToggle } from './SoundToggle';

/** Thanh âm thanh cố định — luôn thấy, không cần nút 🎚 */
export function AppAudioBar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="app-audio-bar" role="region" aria-label="Âm thanh">
      <div className="app-audio-bar__head">
        <span className="app-audio-bar__title">🔊 Âm thanh</span>
        <SoundToggle />
      </div>
      <AudioVolumeControls compact />
    </div>
  );
}

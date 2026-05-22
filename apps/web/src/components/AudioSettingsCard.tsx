import { AudioVolumeControls } from './AudioVolumeControls';
import { SoundToggle } from './SoundToggle';

/** Khối cài đặt âm thanh — dùng ở Hồ sơ và trang Quản trị */
export function AudioSettingsCard() {
  return (
    <div className="card audio-settings-card">
      <div className="audio-settings-card__head">
        <h3 className="audio-settings-card__title">🔊 Cài đặt âm thanh</h3>
        <SoundToggle showLabel />
      </div>
      <AudioVolumeControls showMusicPreview />
    </div>
  );
}

import { useEffect } from 'react';
import {
  startGameMusic,
  stopGameMusic,
  unlockBgmFromGesture,
  type GameMusicId,
} from '../lib/gameMusic';

/** Phát nhạc nền khi vào màn chơi; retry sau thao tác chạm nếu trình duyệt chặn autoplay */
export function useGameMusic(id: GameMusicId, active = true) {
  useEffect(() => {
    if (!active) return;

    startGameMusic(id);

    const onInteract = () => unlockBgmFromGesture();
    document.addEventListener('pointerdown', onInteract, true);
    document.addEventListener('keydown', onInteract, true);

    return () => {
      document.removeEventListener('pointerdown', onInteract, true);
      document.removeEventListener('keydown', onInteract, true);
      stopGameMusic();
    };
  }, [id, active]);
}

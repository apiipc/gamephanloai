import { useEffect } from 'react';
import { startGameMusic, stopGameMusic, type GameMusicId } from '../lib/gameMusic';

/** Phát nhạc nền khi vào màn chơi; dừng khi rời trang */
export function useGameMusic(id: GameMusicId, active = true) {
  useEffect(() => {
    if (!active) return;
    startGameMusic(id);
    return () => stopGameMusic();
  }, [id, active]);
}

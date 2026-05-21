import { useEffect } from 'react';
import {
  startGameMusic,
  stopGameMusic,
  unlockBgmFromGesture,
} from '../lib/gameMusic';

/**
 * Nhạc nền chạy xuyên suốt app (lặp) — không dừng khi đổi trang game.
 * Chỉ dừng khi đăng xuất hoặc tắt âm thanh.
 */
export function useGlobalBgm(active: boolean) {
  useEffect(() => {
    if (!active) {
      stopGameMusic();
      return;
    }

    startGameMusic();

    const onInteract = () => unlockBgmFromGesture();
    document.addEventListener('pointerdown', onInteract, true);
    document.addEventListener('keydown', onInteract, true);

    return () => {
      document.removeEventListener('pointerdown', onInteract, true);
      document.removeEventListener('keydown', onInteract, true);
    };
  }, [active]);
}

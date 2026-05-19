import type { ReactNode } from 'react';

/** Khung full màn hình + nền 2 bên; cột game 480px ở giữa */
export function GameViewport({ children }: { children: ReactNode }) {
  return (
    <div className="game-viewport">
      <div className="game-viewport-sides" aria-hidden />
      <div className="game-viewport-center">{children}</div>
    </div>
  );
}

import type { ReactNode } from 'react';

export function GameScene({ children }: { children: ReactNode }) {
  return (
    <div className="game-scene">
      <div className="game-scene-sky" />
      <div className="game-scene-hills" />
      <div className="game-scene-tree game-scene-tree-left" />
      <div className="game-scene-tree game-scene-tree-right" />
      <div className="game-scene-grass" />
      <div className="game-scene-content">{children}</div>
    </div>
  );
}

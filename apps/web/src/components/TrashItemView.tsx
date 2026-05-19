import type { TrashItem } from '../types';

interface Props {
  item: TrashItem;
  className?: string;
  size?: 'play' | 'ghost';
}

export function TrashItemView({ item, className = '', size = 'play' }: Props) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        className={`game-trash-img ${size === 'ghost' ? 'game-trash-img-ghost' : ''} ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span className={`game-trash-emoji ${className}`} aria-hidden>
      {item.emoji}
    </span>
  );
}

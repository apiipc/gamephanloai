import { useNavigate } from 'react-router-dom';

interface GameBackButtonProps {
  to?: string;
  className?: string;
  label?: string;
}

/** Nút quay lại trên màn chơi (phân loại, v.v.) */
export function GameBackButton({
  to = '/play',
  className = 'game-back-btn',
  label = 'Quay lại',
}: GameBackButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => navigate(to)}
    >
      ←
    </button>
  );
}

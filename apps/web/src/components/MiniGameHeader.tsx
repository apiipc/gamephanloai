import { useNavigate } from 'react-router-dom';

interface Props {
  title?: string;
  showBack?: boolean;
  showAdd?: boolean;
}

export function MiniGameHeader({ title = 'Mini Game', showBack = true, showAdd = true }: Props) {
  const navigate = useNavigate();

  return (
    <header className="mg-header">
      {showBack ? (
        <button type="button" className="mg-header-btn" onClick={() => navigate(-1)} aria-label="Quay lại">
          ←
        </button>
      ) : (
        <span className="mg-header-spacer" />
      )}
      <h1 className="mg-header-title">{title}</h1>
      {showAdd ? (
        <button type="button" className="mg-header-btn mg-header-btn-muted" aria-label="Thêm">
          +
        </button>
      ) : (
        <span className="mg-header-spacer" />
      )}
    </header>
  );
}

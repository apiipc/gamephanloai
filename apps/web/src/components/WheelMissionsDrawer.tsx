import type { WheelMissionState } from '../types';

interface WheelMissionsDrawerProps {
  open: boolean;
  onClose: () => void;
  missions: WheelMissionState[];
  onClaim: (id: string) => void;
  claimingId: string | null;
}

export function WheelMissionsDrawer({
  open,
  onClose,
  missions,
  onClaim,
  claimingId,
}: WheelMissionsDrawerProps) {
  if (!open) return null;

  return (
    <div className="wheel-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="wheel-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Nhiệm vụ hằng ngày"
      >
        <div className="wheel-drawer__handle" />
        <h2 className="wheel-drawer__title">🎯 Nhiệm vụ hằng ngày</h2>
        <p className="wheel-drawer__hint">Hoàn thành để nhận thêm lượt quay</p>

        <ul className="wheel-drawer__list">
          {missions.map((m) => (
            <li key={m.id} className="wheel-drawer__item">
              <div className="wheel-drawer__item-head">
                <strong>{m.title}</strong>
                <span className="wheel-drawer__reward">+{m.rewardSpins} lượt</span>
              </div>
              <p className="wheel-drawer__desc">{m.description}</p>
              <div className="wheel-drawer__progress">
                <div
                  className="wheel-drawer__bar"
                  style={{ width: `${Math.min(100, (m.current / m.targetCount) * 100)}%` }}
                />
              </div>
              <p className="wheel-drawer__count">
                {m.current} / {m.targetCount}
              </p>
              {m.claimed ? (
                <span className="wheel-drawer__claimed">Đã nhận</span>
              ) : m.done ? (
                <button
                  type="button"
                  className="btn btn-primary wheel-drawer__claim"
                  disabled={claimingId === m.id}
                  onClick={() => onClaim(m.id)}
                >
                  {claimingId === m.id ? 'Đang nhận…' : 'Nhận lượt quay'}
                </button>
              ) : (
                <span className="wheel-drawer__pending">Chưa xong</span>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary wheel-drawer__close" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

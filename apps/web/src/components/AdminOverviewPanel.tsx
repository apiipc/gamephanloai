import { FormEvent, useState } from 'react';
import { adminApi } from '../api/client';

export interface GameScoreSummary {
  name: string;
  icon: string;
  plays: number;
  totalPoints: number;
}

export interface PlayerScoreRow {
  id: string;
  fullName: string;
  email: string;
  className: string | null;
  greenPoints: number;
  sortPoints: number;
  sortPlays: number;
  quizPoints: number;
  quizPlays: number;
  wheelPoints: number;
  wheelSpins: number;
  totalPoints: number;
}

interface AdminOverviewPanelProps {
  userCount: number;
  classCount: number;
  sessionCount: number;
  games: {
    sort: GameScoreSummary;
    quiz: GameScoreSummary;
    wheel: GameScoreSummary;
  };
  playerScores: PlayerScoreRow[];
  onMessage?: (msg: string) => void;
  onDataChanged?: () => void;
}

export function AdminOverviewPanel({
  userCount,
  classCount,
  sessionCount,
  games,
  playerScores,
  onMessage,
  onDataChanged,
}: AdminOverviewPanelProps) {
  const grandTotal =
    games.sort.totalPoints + games.quiz.totalPoints + games.wheel.totalPoints;

  const [editRow, setEditRow] = useState<PlayerScoreRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<PlayerScoreRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const canEdit = Boolean(onDataChanged);

  const notify = (msg: string) => {
    onMessage?.(msg);
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editRow) return;
    setFormError('');
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('fullName') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const className = String(fd.get('className') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    if (!fullName || !email) {
      setFormError('Họ tên và email là bắt buộc');
      return;
    }
    if (!className) {
      setFormError('Vui lòng nhập lớp');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { fullName, email, className };
      if (password.length > 0) {
        if (password.length < 6) {
          setFormError('Mật khẩu tối thiểu 6 ký tự');
          setSaving(false);
          return;
        }
        body.password = password;
      }
      await adminApi.updateUser(editRow.id, body);
      notify('Đã cập nhật tài khoản học sinh');
      setEditRow(null);
      onDataChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteRow.id);
      notify(`Đã xóa tài khoản ${deleteRow.fullName}`);
      setDeleteRow(null);
      onDataChanged?.();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không xóa được');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-overview">
      <div className="admin-grid admin-overview__stats">
        <div className="stat-card">
          <h3>Học sinh</h3>
          <p>{userCount}</p>
        </div>
        <div className="stat-card">
          <h3>Lượt chơi (3 game)</h3>
          <p>{sessionCount}</p>
        </div>
        <div className="stat-card">
          <h3>Lớp học</h3>
          <p>{classCount}</p>
        </div>
        <div className="stat-card stat-card--highlight">
          <h3>Tổng điểm 3 trò</h3>
          <p>{grandTotal}</p>
        </div>
      </div>

      <h3 className="admin-overview__section-title">Điểm theo từng trò chơi</h3>
      <div className="admin-overview__games">
        {([games.sort, games.quiz, games.wheel] as const).map((g) => (
          <div key={g.name} className="admin-overview__game-card">
            <span className="admin-overview__game-icon">{g.icon}</span>
            <strong>{g.name}</strong>
            <p className="admin-overview__game-meta">
              {g.plays} lượt · <span className="admin-overview__pts">{g.totalPoints}</span> điểm
            </p>
          </div>
        ))}
      </div>

      <div className="card admin-overview__table-card">
        <h3 className="admin-overview__section-title">Bảng điểm từng người chơi</h3>
        <p className="admin-overview__hint">
          Điểm mỗi cột = tổng điểm đã ghi nhận trong trò đó. <strong>Tổng 3 trò</strong> = cộng 3
          cột. Cột <strong>Điểm xanh (hồ sơ)</strong> là số trên tài khoản.
          {canEdit && (
            <>
              {' '}
              Dùng <strong>Sửa</strong> / <strong>Xóa</strong> để quản lý tài khoản học sinh trong
              phạm vi của bạn.
            </>
          )}
        </p>
        <div className="admin-overview__table-wrap">
          <table className="wheel-admin__table admin-overview__table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Lớp</th>
                <th title="Phân loại siêu tốc">♻️ Phân loại</th>
                <th title="Quiz">🧠 Quiz</th>
                <th title="Vòng quay">🎡 Vòng quay</th>
                <th>Tổng 3 trò</th>
                <th>Điểm xanh</th>
                {canEdit && <th style={{ minWidth: 110 }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {playerScores.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    style={{ textAlign: 'center', color: 'var(--gray-500)' }}
                  >
                    Chưa có học sinh trong phạm vi xem
                  </td>
                </tr>
              ) : (
                playerScores.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <br />
                      <span className="admin-overview__email">{row.email}</span>
                    </td>
                    <td>{row.className ?? '—'}</td>
                    <td className="admin-overview__num">
                      {row.sortPoints}
                      <span className="admin-overview__sub">{row.sortPlays} lượt</span>
                    </td>
                    <td className="admin-overview__num">
                      {row.quizPoints}
                      <span className="admin-overview__sub">{row.quizPlays} lượt</span>
                    </td>
                    <td className="admin-overview__num">
                      {row.wheelPoints}
                      <span className="admin-overview__sub">{row.wheelSpins} lần quay</span>
                    </td>
                    <td className="admin-overview__num admin-overview__num--total">
                      {row.totalPoints}
                    </td>
                    <td className="admin-overview__num">⭐ {row.greenPoints}</td>
                    {canEdit && (
                      <td>
                        <div className="admin-overview__actions">
                          <button
                            type="button"
                            className="btn btn-secondary wheel-admin__btn-sm"
                            onClick={() => {
                              setFormError('');
                              setEditRow(row);
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary wheel-admin__btn-sm trash-catalog__btn--danger"
                            onClick={() => setDeleteRow(row)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && (
        <div
          className="feedback-overlay"
          style={{ position: 'fixed', zIndex: 200 }}
          role="presentation"
          onClick={() => !saving && setEditRow(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 420, width: '100%', margin: 16, zIndex: 201 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-edit-student-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="admin-edit-student-title" style={{ marginTop: 0 }}>
              Sửa học sinh
            </h3>
            <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
              <strong>{editRow.fullName}</strong> — chỉnh họ tên, email, lớp hoặc đặt mật khẩu mới
              (để trống nếu giữ nguyên).
            </p>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="user-admin__field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Họ tên *</span>
                <input name="fullName" required defaultValue={editRow.fullName} autoComplete="name" />
              </label>
              <label className="user-admin__field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Email *</span>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editRow.email}
                  autoComplete="email"
                />
              </label>
              <label className="user-admin__field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Lớp *</span>
                <input name="className" required defaultValue={editRow.className ?? ''} placeholder="VD: 6A1" />
              </label>
              <label className="user-admin__field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Mật khẩu mới</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Để trống nếu không đổi"
                />
              </label>
              {formError && (
                <p style={{ color: '#b91c1c', margin: 0, fontSize: 14 }}>{formError}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => setEditRow(null)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteRow && (
        <div
          className="feedback-overlay"
          style={{ position: 'fixed', zIndex: 200 }}
          role="presentation"
          onClick={() => !deleting && setDeleteRow(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 400, width: '100%', margin: 16, zIndex: 201 }}
            role="dialog"
            aria-labelledby="admin-delete-student-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="admin-delete-student-title" style={{ marginTop: 0, color: '#b91c1c' }}>
              Xóa tài khoản?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--gray-700)' }}>
              Xóa vĩnh viễn <strong>{deleteRow.fullName}</strong> ({deleteRow.email}). Lịch sử chơi
              và điểm liên quan sẽ bị xóa theo. Thao tác không hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#b91c1c' }}
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setDeleteRow(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 12 }}>
        Giáo viên chỉ xem HS các lớp được gán. Quản trị trường xem toàn trường.
      </p>
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAdmin, refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <div className="app-shell">
      <div className="page">
        <header style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Xin chào,</p>
          <h1 style={{ fontSize: 22, color: 'var(--green-700)' }}>{user?.fullName}</h1>
          {user?.class && (
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Lớp {user.class.name}</p>
          )}
        </header>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, opacity: 0.9 }}>Điểm xanh của bạn</p>
          <p style={{ fontSize: 36, fontWeight: 800 }}>⭐ {user?.greenPoints ?? 0}</p>
        </div>

        <h2 style={{ fontSize: 16, marginBottom: 12 }}>🎮 Mini Game</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
          CHƠI GAME NHẬN ĐIỂM XANH
        </p>

        {user?.role === 'STUDENT' && (
        <Link to="/wheel" className="card" style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40 }}>🎡</span>
            <div>
              <strong>Vòng Quay Xanh</strong>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                Quay trúng quà — nhiệm vụ hằng ngày
              </p>
            </div>
          </div>
        </Link>
        )}

        <Link to="/play" className="card" style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40 }}>♻️</span>
            <div>
              <strong>Phân loại siêu tốc</strong>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                Kéo rác vào thùng phù hợp — +10 / -5 điểm
              </p>
            </div>
          </div>
        </Link>

        {isAdmin && (
          <Link to="/admin" className="btn btn-outline" style={{ width: '100%', marginTop: 8 }}>
            ⚙️ Bảng quản trị
          </Link>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

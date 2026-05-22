import { Link } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { AudioSettingsCard } from '../components/AudioSettingsCard';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayerScores } from '../hooks/usePlayerScores';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Học sinh',
  TEACHER: 'Giáo viên',
  ORG_ADMIN: 'Quản trị trường',
  SUPER_ADMIN: 'Super Admin',
};

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const scores = usePlayerScores();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <div className="app-shell">
      <div className="page">
        <h2 style={{ marginBottom: 20 }}>👤 Hồ sơ</h2>
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Họ tên</p>
          <p style={{ fontWeight: 800, fontSize: 18 }}>{user?.fullName}</p>
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--gray-100)' }} />
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Email</p>
          <p>{user?.email}</p>
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--gray-100)' }} />
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Vai trò</p>
          <p>{user?.role ? ROLE_LABELS[user.role] : ''}</p>
          {user?.class && (
            <>
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--gray-100)' }} />
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Lớp</p>
              <p>{user.class.name}</p>
            </>
          )}
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--gray-100)' }} />
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Tổng điểm 3 trò chơi</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-600)' }}>
            ⭐ {scores?.totalPoints ?? 0}
          </p>
          {scores && user?.classId && (
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
              Phân loại {scores.sortPoints} · Quiz {scores.quizPoints} · Vòng quay {scores.wheelPoints}
            </p>
          )}
        </div>
        <AudioSettingsCard />
        <Link
          to="/sounds"
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: 12, textAlign: 'center' }}
        >
          📋 Danh sách hiệu ứng (SFX)
        </Link>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={logout}>
          Đăng xuất
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

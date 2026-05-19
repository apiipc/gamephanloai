import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Học sinh',
  TEACHER: 'Giáo viên',
  ORG_ADMIN: 'Quản trị trường',
  SUPER_ADMIN: 'Super Admin',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();

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
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Điểm xanh</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-600)' }}>
            ⭐ {user?.greenPoints ?? 0}
          </p>
        </div>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={logout}>
          Đăng xuất
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

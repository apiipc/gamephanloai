import { BottomNav } from '../components/BottomNav';

export default function MissionsPage() {
  return (
    <div className="app-shell">
      <div className="page">
        <h2 style={{ marginBottom: 16 }}>🎯 Nhiệm vụ</h2>
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Chơi 3 lần hôm nay</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Hoàn thành 3 vòng Phân Loại Siêu Tốc để nhận +30 điểm thưởng
          </p>
          <div
            style={{
              height: 8,
              background: 'var(--gray-100)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '33%',
                height: '100%',
                background: 'var(--green-500)',
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>1 / 3 hoàn thành</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 16 }}>
          Nhiệm vụ động sẽ được đồng bộ từ server trong phiên bản tiếp theo.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

import { usePlayerScores } from '../hooks/usePlayerScores';
import { useTeacherClassStats } from '../hooks/useTeacherClassStats';

/** Điểm cá nhân GV khi chơi + tổng điểm từng lớp phụ trách. */
export function TeacherScoreBanner() {
  const scores = usePlayerScores();
  const { classes, loading } = useTeacherClassStats();

  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>Điểm của bạn (3 trò)</p>
        <p style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 0' }}>
          ⭐ {scores?.totalPoints ?? 0}
        </p>
        {scores && (
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 8, lineHeight: 1.5 }}>
            ♻️ {scores.sortPoints} · 🧠 {scores.quizPoints} · 🎡 {scores.wheelPoints}
          </p>
        )}
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>Đang tải điểm lớp…</p>
      )}

      {!loading &&
        classes.map((c) => (
          <div
            key={c.classId}
            className="card"
            style={{
              borderLeft: '4px solid var(--green-500)',
            }}
          >
            <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 4px' }}>
              Tổng điểm lớp {c.className}
              <span style={{ marginLeft: 8, fontSize: 12 }}>({c.studentCount} HS)</span>
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-700)', margin: 0 }}>
              ⭐ {c.totalPoints}
            </p>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8, lineHeight: 1.5 }}>
              ♻️ {c.sortPoints} · 🧠 {c.quizPoints} · 🎡 {c.wheelPoints}
            </p>
          </div>
        ))}

      {!loading && classes.length === 0 && (
        <div className="card">
          <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-600)' }}>
            Chưa được gắn GVCN lớp nào. Liên hệ quản trị trường để phân lớp.
          </p>
        </div>
      )}
    </div>
  );
}

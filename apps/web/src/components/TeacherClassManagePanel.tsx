import { useEffect, useMemo, useState } from 'react';
import { adminApi, leaderboardApi } from '../api/client';
import type { LeaderboardEntry } from '../types';
import type { ManagedClassStat } from '../hooks/useTeacherClassStats';

export function TeacherClassManagePanel() {
  const [classes, setClasses] = useState<ManagedClassStat[]>([]);
  const [adminClasses, setAdminClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      leaderboardApi.managedClasses() as Promise<ManagedClassStat[]>,
      adminApi.classes() as Promise<{ id: string; name: string }[]>,
    ])
      .then(([stats, list]) => {
        setClasses(stats);
        setAdminClasses(list);
        if (stats.length > 0) setSelectedId(stats[0].classId);
        else if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {
        setClasses([]);
        setAdminClasses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    leaderboardApi
      .classBoard(selectedId, 'total')
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);
        setStudents(
          sorted.map((e, i) => ({
            ...e,
            rank: i + 1,
            score: e.totalPoints,
          })),
        );
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selectedId]);

  const selectedStat = useMemo(
    () => classes.find((c) => c.classId === selectedId),
    [classes, selectedId],
  );

  const pickerList =
    classes.length > 0
      ? classes.map((c) => ({ id: c.classId, name: c.className }))
      : adminClasses;

  if (loading) {
    return <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Đang tải quản trị lớp…</p>;
  }

  if (pickerList.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: 14 }}>
          Bạn chưa được gắn làm GVCN lớp nào. Liên hệ quản trị trường để gán bạn phụ trách lớp.
        </p>
      </div>
    );
  }

  return (
    <div className="teacher-class-manage">
      <div className="teacher-classes card" style={{ marginBottom: 16 }}>
        <h3 className="teacher-classes__title">📚 Lớp bạn quản lý</h3>
        <ul className="teacher-classes__list">
          {pickerList.map((c) => {
            const stat = classes.find((x) => x.classId === c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`teacher-classes__btn ${selectedId === c.id ? 'teacher-classes__btn--active' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <strong>{c.name}</strong>
                  <span>
                    {stat
                      ? `${stat.studentCount} HS · ⭐ ${stat.totalPoints}`
                      : '0 HS'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedStat && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #ecfdf5, #fff)',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 4px' }}>
            Tổng điểm 3 trò — lớp {selectedStat.className}
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--green-700)', margin: 0 }}>
            ⭐ {selectedStat.totalPoints}
          </p>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
            ♻️ {selectedStat.sortPoints} · 🧠 {selectedStat.quizPoints} · 🎡{' '}
            {selectedStat.wheelPoints} · {selectedStat.studentCount} học sinh
          </p>
        </div>
      )}

      <div className="card user-admin__table-wrap">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Điểm học sinh trong lớp</h3>
        {loadingStudents ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Đang tải…</p>
        ) : students.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Chưa có học sinh hoặc chưa có điểm.</p>
        ) : (
          <table className="wheel-admin__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Họ tên</th>
                <th>♻️</th>
                <th>🧠</th>
                <th>🎡</th>
                <th>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.rank}</td>
                  <td>{s.fullName}</td>
                  <td>{s.sortPoints}</td>
                  <td>{s.quizPoints}</td>
                  <td>{s.wheelPoints}</td>
                  <td>
                    <strong>{s.totalPoints}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

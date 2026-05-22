import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { TeacherClassesPanel } from '../components/TeacherClassesPanel';
import { leaderboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardEntry, LeaderboardMode } from '../types';

const MODES: { id: LeaderboardMode; label: string }[] = [
  { id: 'green', label: '⭐ Điểm xanh' },
  { id: 'sort', label: '♻️ Phân loại' },
  { id: 'quiz', label: '🧠 Quiz' },
  { id: 'wheel', label: '🎡 Vòng quay' },
  { id: 'total', label: 'Tổng 3 trò' },
];

function scoreFor(entry: LeaderboardEntry, mode: LeaderboardMode): number {
  switch (mode) {
    case 'sort':
      return entry.sortPoints;
    case 'quiz':
      return entry.quizPoints;
    case 'wheel':
      return entry.wheelPoints;
    case 'total':
      return entry.totalPoints;
    default:
      return entry.greenPoints;
  }
}

function rankEntries(entries: LeaderboardEntry[], mode: LeaderboardMode): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => scoreFor(b, mode) - scoreFor(a, mode))
    .map((e, i) => ({
      ...e,
      rank: i + 1,
      score: scoreFor(e, mode),
    }));
}

function scoreColumnLabel(mode: LeaderboardMode): string {
  switch (mode) {
    case 'sort':
      return 'Điểm phân loại';
    case 'quiz':
      return 'Điểm quiz';
    case 'wheel':
      return 'Điểm vòng quay';
    case 'total':
      return 'Tổng 3 trò';
    default:
      return 'Điểm xanh';
  }
}

function formatScore(mode: LeaderboardMode, score: number): string {
  return mode === 'green' ? `⭐ ${score}` : String(score);
}

export default function LeaderboardPage() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [raw, setRaw] = useState<LeaderboardEntry[]>([]);
  const [mode, setMode] = useState<LeaderboardMode>('total');
  const [classRanks, setClassRanks] = useState<
    { rank: number; className: string; totalPoints: number; studentCount: number }[]
  >([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState('');

  const showClassPicker = isTeacher || user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user?.role === 'STUDENT' && user.classId) {
      setSelectedClassId(user.classId);
      setSelectedClassName(user.class?.name ?? '');
    }
  }, [user?.classId, user?.class?.name, user?.role]);

  useEffect(() => {
    if (!selectedClassId && user?.role === 'STUDENT') {
      setRaw([]);
      return;
    }
    if (showClassPicker && !selectedClassId) {
      setRaw([]);
      return;
    }

    const classId = selectedClassId || undefined;
    leaderboardApi
      .classBoard(classId, mode)
      .then(setRaw)
      .catch(() => setRaw([]));
  }, [selectedClassId, mode, showClassPicker, user?.role]);

  useEffect(() => {
    if (isTeacher) {
      leaderboardApi
        .managedClasses()
        .then((rows) =>
          setClassRanks(
            rows.map((c) => ({
              rank: c.rank,
              className: c.className,
              totalPoints: c.totalPoints,
              studentCount: c.studentCount,
            })),
          ),
        )
        .catch(() => setClassRanks([]));
      return;
    }
    if (isAdmin) {
      leaderboardApi.classes().then(setClassRanks).catch(() => setClassRanks([]));
    }
  }, [isAdmin, isTeacher]);

  const board = useMemo(() => rankEntries(raw, mode), [raw, mode]);

  return (
    <div className="app-shell">
      <div className="page">
        <h2 style={{ marginBottom: 8 }}>📊 Bảng xếp hạng</h2>

        {isTeacher && (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Giáo viên: chọn lớp để xem điểm từng học sinh.
          </p>
        )}

        {user?.class && user.role === 'STUDENT' && (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Lớp {user.class.name}
          </p>
        )}

        {showClassPicker && (
          <div style={{ marginBottom: 16 }}>
            <TeacherClassesPanel
              selectedClassId={selectedClassId}
              onSelectClass={(id, name) => {
                setSelectedClassId(id);
                setSelectedClassName(name);
              }}
            />
          </div>
        )}

        <div className="leaderboard-tabs" role="tablist" aria-label="Loại điểm xếp hạng">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`leaderboard-tabs__btn ${mode === m.id ? 'leaderboard-tabs__btn--active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="leaderboard-tabs__hint">
          {selectedClassName ? (
            <>
              Xếp hạng lớp <strong>{selectedClassName}</strong>. <strong>Tổng 3 trò</strong> = Phân
              loại + Quiz + Vòng quay.
            </>
          ) : showClassPicker ? (
            'Chọn một lớp ở trên để xem bảng điểm học sinh.'
          ) : (
            <>
              Chọn loại điểm để xếp hạng trong lớp. <strong>Tổng 3 trò</strong> = cộng điểm Phân loại
              + Quiz + Vòng quay.
            </>
          )}
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          {board.length === 0 ? (
            <p style={{ color: 'var(--gray-500)' }}>
              {showClassPicker && !selectedClassId
                ? 'Chưa chọn lớp'
                : 'Chưa có dữ liệu trong lớp này'}
            </p>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Học sinh</th>
                    <th>{scoreColumnLabel(mode)}</th>
                    {mode === 'total' && (
                      <>
                        <th className="leaderboard-table__sub">♻️</th>
                        <th className="leaderboard-table__sub">🧠</th>
                        <th className="leaderboard-table__sub">🎡</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {board.map((e) => (
                    <tr
                      key={e.id}
                      className={e.id === user?.id ? 'leaderboard-table__me' : undefined}
                    >
                      <td>{e.rank}</td>
                      <td>{e.fullName}</td>
                      <td className="leaderboard-table__score">
                        {formatScore(mode, e.score)}
                      </td>
                      {mode === 'total' && (
                        <>
                          <td className="leaderboard-table__sub">{e.sortPoints}</td>
                          <td className="leaderboard-table__sub">{e.quizPoints}</td>
                          <td className="leaderboard-table__sub">{e.wheelPoints}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAdmin && classRanks.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>
              {isTeacher ? 'Tổng điểm các lớp bạn quản lý' : 'Xếp hạng lớp (trường)'}
            </h3>
            <div className="card leaderboard-class-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lớp</th>
                    <th>Tổng 3 trò</th>
                    <th>HS</th>
                  </tr>
                </thead>
                <tbody>
                  {classRanks.map((c) => (
                    <tr key={c.className}>
                      <td>{c.rank}</td>
                      <td>{c.className}</td>
                      <td>{c.totalPoints}</td>
                      <td>{c.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

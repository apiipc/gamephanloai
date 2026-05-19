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
}

export function AdminOverviewPanel({
  userCount,
  classCount,
  sessionCount,
  games,
  playerScores,
}: AdminOverviewPanelProps) {
  const grandTotal =
    games.sort.totalPoints + games.quiz.totalPoints + games.wheel.totalPoints;

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
              </tr>
            </thead>
            <tbody>
              {playerScores.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 12 }}>
        Giáo viên chỉ xem HS các lớp được gán. Quản trị trường xem toàn trường.
      </p>
    </div>
  );
}

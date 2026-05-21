import { GameViewport } from '../components/GameViewport';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { leaderboardApi } from '../api/client';
import { playSound } from '../lib/sounds';

interface ResultState {
  score: number;
  correctCount: number;
  totalCount: number;
  bonus: number;
}

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [rank, setRank] = useState<number | null>(null);

  const data = state as ResultState | null;

  useEffect(() => {
    if (!data) {
      navigate('/play');
      return;
    }
    playSound('win');
    leaderboardApi.myRank('sort').then((r) => setRank(r?.rank ?? null)).catch(() => {});
  }, [data, navigate]);

  if (!data) return null;

  return (
    <GameViewport>
    <div className="app-shell app-shell--game">
      <div className="page" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p style={{ fontSize: 48 }}>🏆</p>
        <h1 style={{ fontSize: 24, marginBottom: 24, color: 'var(--green-700)' }}>KẾT QUẢ</h1>

        <div className="card" style={{ marginBottom: 16, textAlign: 'left' }}>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Điểm của bạn</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--green-600)' }}>{data.score}</p>
        </div>

        <div className="card" style={{ marginBottom: 16, textAlign: 'left' }}>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Đúng</p>
          <p style={{ fontSize: 24, fontWeight: 800 }}>
            {data.correctCount} / {data.totalCount}
          </p>
        </div>

        {rank !== null && (
          <div className="card" style={{ marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Xếp hạng lớp</p>
            <p style={{ fontSize: 24, fontWeight: 800 }}>#{rank}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <Link to="/game" className="btn btn-primary">
            Chơi lại
          </Link>
          <Link to="/" className="btn btn-secondary">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
    </GameViewport>
  );
}

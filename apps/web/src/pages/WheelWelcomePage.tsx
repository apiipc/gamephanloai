import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wheelApi } from '../api/client';
import { GameViewport } from '../components/GameViewport';
import { useAuth } from '../context/AuthContext';
import { WHEEL_TITLE } from '../wheel/constants';
import { WheelRulesPanel } from '../wheel/WheelRulesPanel';

export default function WheelWelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spins, setSpins] = useState<number | null>(null);

  useEffect(() => {
    wheelApi
      .state()
      .then((s) => setSpins(s.spinsRemaining))
      .catch(() => setSpins(null));
  }, []);

  return (
    <GameViewport>
      <div className="app-shell app-shell--game wheel-shell">
        <div className="page wheel-welcome">
          <Link to="/play" className="quiz-back">
            ← Quay lại
          </Link>

          <div className="wheel-welcome__hero">
            <img
              src="/assets/wheel-spec.png"
              alt=""
              className="wheel-welcome__spec"
            />
            <div className="wheel-welcome__hero-overlay">
              <span className="wheel-welcome__emoji">🎡</span>
              <h1 className="wheel-welcome__title">{WHEEL_TITLE}</h1>
              <p className="wheel-welcome__subtitle">Quay trúng quà — tích điểm xanh</p>
            </div>
          </div>

          <div className="wheel-welcome__stats">
            <div className="quiz-stat-pill">
              <span className="quiz-stat-pill__label">Điểm xanh</span>
              <strong>⭐ {user?.greenPoints ?? 0}</strong>
            </div>
            <div className="quiz-stat-pill">
              <span className="quiz-stat-pill__label">Lượt quay hôm nay</span>
              <strong>{spins ?? '—'}</strong>
            </div>
          </div>

          <WheelRulesPanel />

          <div className="wheel-welcome__actions">
            <button
              type="button"
              className="btn btn-primary quiz-btn-start"
              onClick={() => navigate('/wheel/play')}
            >
              🎡 Quay ngay
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/wheel/history')}
            >
              📜 Lịch sử quay
            </button>
          </div>
        </div>
      </div>
    </GameViewport>
  );
}

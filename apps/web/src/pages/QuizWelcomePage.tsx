import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameViewport } from '../components/GameViewport';
import { leaderboardApi, quizApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { QUIZ_TITLE } from '../quiz/constants';
import { QuizRulesPanel } from '../quiz/QuizRulesPanel';

export default function QuizWelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  const [config, setConfig] = useState({ questionsPerRound: 10, secondsPerQuestion: 10 });
  useEffect(() => {
    leaderboardApi.myRank('quiz').then((r) => setRank(r?.rank ?? null)).catch(() => {});
    quizApi.getConfig().then(setConfig).catch(() => {});
  }, []);

  return (
    <GameViewport>
      <div className="app-shell app-shell--game quiz-shell">
        <div className="page quiz-welcome">
          <Link to="/play" className="quiz-back">
            ← Quay lại
          </Link>

          <div className="quiz-welcome__hero">
            <img src="/assets/quiz-hero.jpg" alt="" className="quiz-welcome__hero-img" />
            <div className="quiz-welcome__hero-overlay">
              <span className="quiz-welcome__leaf">🌿</span>
              <h1 className="quiz-welcome__title">{QUIZ_TITLE}</h1>
              <p className="quiz-welcome__subtitle">Trường Xanh — Mini Game</p>
            </div>
          </div>

          <div className="quiz-welcome__stats">
            <div className="quiz-stat-pill">
              <span className="quiz-stat-pill__label">Điểm của bạn</span>
              <strong>⭐ {user?.greenPoints ?? 0}</strong>
            </div>
            <div className="quiz-stat-pill">
              <span className="quiz-stat-pill__label">Xếp hạng</span>
              <strong>#{rank ?? '—'}</strong>
            </div>
          </div>

          <p className="quiz-welcome__meta">
            {config.questionsPerRound} câu · {config.secondsPerQuestion} giây / câu
          </p>

          <QuizRulesPanel />

          <div className="quiz-welcome__actions">
            <button
              type="button"
              className="btn btn-primary quiz-btn-start"
              onClick={() => navigate('/quiz/play')}
            >
              🎮 Bắt đầu chơi
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/quiz/play?practice=1')}
            >
              📖 Luyện tập
            </button>
          </div>
        </div>
      </div>
    </GameViewport>
  );
}

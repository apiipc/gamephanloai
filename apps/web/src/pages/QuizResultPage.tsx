import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { GameViewport } from '../components/GameViewport';
import { QUIZ_SCORING } from '../quiz/constants';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../lib/sounds';

interface QuizResultState {
  score: number;
  correctCount: number;
  totalCount: number;
  maxCombo?: number;
  completionBonus?: number;
  practice?: boolean;
}

export default function QuizResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const data = state as QuizResultState | null;

  useEffect(() => {
    if (!data) {
      navigate('/quiz');
      return;
    }
    playSound('win');
    void refreshUser();
  }, [data, navigate, refreshUser]);

  if (!data) return null;

  const accuracy = Math.round((data.correctCount / Math.max(data.totalCount, 1)) * 100);

  return (
    <GameViewport>
      <div className="app-shell app-shell--game quiz-shell">
        <div className="page quiz-result">
          <p className="quiz-result__emoji">🎉</p>
          <h1 className="quiz-result__title">TUYỆT VỜI!</h1>
          {data.practice && (
            <p className="quiz-result__practice">Chế độ luyện tập — điểm vẫn được ghi nhận</p>
          )}

          <div className="quiz-result__grid">
            <div className="quiz-result__stat quiz-result__stat--primary">
              <span>Điểm nhận được</span>
              <strong>⭐ {data.score}</strong>
              {data.completionBonus ? (
                <small>+{data.completionBonus} hoàn thành quiz</small>
              ) : null}
            </div>
            <div className="quiz-result__stat">
              <span>Độ chính xác</span>
              <strong>
                {data.correctCount}/{data.totalCount}
              </strong>
              <small>{accuracy}% đúng</small>
            </div>
            <div className="quiz-result__stat">
              <span>Combo cao nhất</span>
              <strong>🔥 {data.maxCombo ?? 0}</strong>
              <small>Liên tiếp {QUIZ_SCORING.comboStreak}+ câu đúng</small>
            </div>
          </div>

          <div className="quiz-result__rules-mini">
            <p>Đúng +{QUIZ_SCORING.correct} · Sai {QUIZ_SCORING.wrong} · Combo +{QUIZ_SCORING.comboBonus}</p>
          </div>

          <div className="quiz-result__actions">
            <Link to="/quiz/play" className="btn btn-primary">
              🔄 Chơi lại
            </Link>
            <Link to="/" className="btn btn-secondary">
              🏠 Về trang chủ
            </Link>
            <Link to="/leaderboard" className="btn btn-secondary">
              🏆 Bảng xếp hạng
            </Link>
          </div>
        </div>
      </div>
    </GameViewport>
  );
}

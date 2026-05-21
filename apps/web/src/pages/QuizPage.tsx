import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GameViewport } from '../components/GameViewport';
import { quizApi } from '../api/client';
import { SoundToggle } from '../components/SoundToggle';
import { playSound } from '../lib/sounds';
import type { QuizPlayQuestion } from '../types';
import {
  OPTION_STYLES,
  PROGRESS_ICONS,
  QUIZ_SCORING,
  questionDifficulty,
} from '../quiz/constants';
import { sanitizeQuizQuestion } from '../quiz/sanitizeQuestion';

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const practice = searchParams.get('practice') === '1';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizPlayQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'wrong' | 'timeout';
    title: string;
    text: string;
    explanation?: string | null;
    comboBonus?: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const finishedRef = useRef(false);
  const processingRef = useRef(false);
  const prevTimeLeftRef = useRef(10);

  useEffect(() => {
    (async () => {
      try {
        const data = await quizApi.start();
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setSecondsPerQuestion(data.secondsPerQuestion);
        setTimeLeft(data.secondsPerQuestion);
        prevTimeLeftRef.current = data.secondsPerQuestion;
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Không bắt đầu được quiz');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const finishQuiz = useCallback(async () => {
    if (finishedRef.current || !sessionId) return;
    finishedRef.current = true;
    playSound('finish');
    try {
      const result = await quizApi.finish(sessionId);
      navigate('/quiz/result', {
        state: {
          score: result.score,
          correctCount: result.correctCount,
          totalCount: result.totalCount,
          maxCombo: result.maxCombo ?? maxCombo,
          completionBonus: result.completionBonus ?? 0,
          practice,
        },
      });
    } catch {
      navigate('/quiz');
    }
  }, [sessionId, navigate, maxCombo, practice]);

  const goNext = useCallback(() => {
    setFeedback(null);
    setSelectedKey(null);
    setProcessing(false);
    processingRef.current = false;
    if (index + 1 >= questions.length) {
      finishQuiz();
    } else {
      setIndex((i) => i + 1);
      setTimeLeft(secondsPerQuestion);
      prevTimeLeftRef.current = secondsPerQuestion;
    }
  }, [index, questions.length, secondsPerQuestion, finishQuiz]);

  const submitAnswer = useCallback(
    async (chosen: string | null) => {
      if (processingRef.current || !sessionId || finishedRef.current) return;
      const q = questions[index];
      if (!q) return;

      processingRef.current = true;
      setProcessing(true);
      if (chosen) setSelectedKey(chosen);

      try {
        if (chosen) {
          const res = await quizApi.answer(sessionId, q.id, chosen);
          setScore(res.session.score);
          const newStreak = res.currentStreak ?? 0;
          setComboStreak(newStreak);
          if (newStreak > maxCombo) setMaxCombo(newStreak);

          const comboMsg =
            res.comboBonus && res.comboBonus > 0
              ? ` 🔥 Combo +${res.comboBonus}!`
              : '';

          playSound(res.isCorrect ? 'correct' : 'wrong');
          if (res.comboBonus && res.comboBonus > 0) playSound('combo');
          setFeedback({
            type: res.isCorrect ? 'correct' : 'wrong',
            title: res.isCorrect ? 'CHÍNH XÁC!' : 'CHƯA ĐÚNG!',
            text: res.isCorrect
              ? `+${res.pointsDelta} điểm${comboMsg}`
              : `${res.pointsDelta} điểm · Đáp án đúng: ${res.correctOption}`,
            explanation: res.explanation,
            comboBonus: res.comboBonus,
          });
        } else {
          playSound('timeout');
          setComboStreak(0);
          setFeedback({
            type: 'timeout',
            title: 'HẾT GIỜ!',
            text: 'Không chọn đáp án — chuyển câu tiếp theo',
          });
        }
        setTimeout(goNext, chosen ? 1600 : 900);
      } catch {
        processingRef.current = false;
        setProcessing(false);
        setSelectedKey(null);
      }
    },
    [sessionId, questions, index, goNext, maxCombo],
  );

  useEffect(() => {
    if (loading || feedback || processing || !questions.length) return;
    if (timeLeft <= 0) {
      submitAnswer(null);
      return;
    }
    if (timeLeft <= 3 && timeLeft < prevTimeLeftRef.current) {
      playSound('tick');
    }
    prevTimeLeftRef.current = timeLeft;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, feedback, processing, questions.length, submitAnswer]);

  if (loading) {
    return (
      <GameViewport>
        <div className="app-shell app-shell--game quiz-shell">
          <div className="page quiz-loading">
            <div className="quiz-loading__spinner" />
            <p>Đang chuẩn bị câu hỏi…</p>
          </div>
        </div>
      </GameViewport>
    );
  }

  if (loadError) {
    return (
      <GameViewport>
        <div className="app-shell app-shell--game quiz-shell">
          <div className="page quiz-loading">
            <p className="quiz-error">{loadError}</p>
            <Link to="/quiz" className="btn btn-primary">
              Về trang quiz
            </Link>
          </div>
        </div>
      </GameViewport>
    );
  }

  const q = questions[index];
  if (!q) return null;

  const difficulty = questionDifficulty(index, questions.length);
  const timerPct = (timeLeft / secondsPerQuestion) * 100;

  return (
    <GameViewport>
      <div className="app-shell app-shell--game quiz-shell">
        <div className="page quiz-play">
          <div className="quiz-play__top">
            <Link to="/quiz" className="quiz-back quiz-back--light">
              ←
            </Link>
            <div className="quiz-play__head">
              <span className="quiz-play__qnum">
                Câu {index + 1}/{questions.length}
              </span>
              <span className={`quiz-difficulty quiz-difficulty--${difficulty === 'Dễ' ? 'easy' : difficulty === 'Trung bình' ? 'medium' : 'hard'}`}>
                {difficulty}
              </span>
            </div>
            <div className="quiz-play__score-row">
              <span className="quiz-play__score">⭐ {score}</span>
              <SoundToggle className="quiz-play__sound" />
            </div>
          </div>

          <div className="quiz-progress" aria-label="Tiến độ">
            {questions.map((_, i) => {
              const icon = PROGRESS_ICONS[i % PROGRESS_ICONS.length];
              let state = 'upcoming';
              if (i < index) state = 'done';
              else if (i === index) state = 'current';
              return (
                <span
                  key={i}
                  className={`quiz-progress__step quiz-progress__step--${state}`}
                  title={`Câu ${i + 1}`}
                >
                  {icon}
                </span>
              );
            })}
          </div>

          <div className="quiz-timer">
            <div
              className="quiz-timer__fill"
              style={{ width: `${timerPct}%` }}
            />
            <span className="quiz-timer__text">⏱ {timeLeft}s</span>
          </div>

          {practice && (
            <p className="quiz-practice-tag">Chế độ luyện tập — có giải thích sau mỗi câu</p>
          )}

          <div className="quiz-question-card">
            <div className="quiz-question-card__badge">
              Câu {index + 1} / {questions.length}
            </div>
            <p className="quiz-question-card__text">
              {sanitizeQuizQuestion(q.question)}
            </p>
          </div>

          <div className="quiz-options">
            {q.options.map((opt) => {
              const style = OPTION_STYLES[opt.key] ?? OPTION_STYLES.D;
              const isSelected = selectedKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`quiz-option-btn ${isSelected ? 'quiz-option-btn--selected' : ''}`}
                  style={{
                    borderColor: style.border,
                    background: style.bg,
                  }}
                  disabled={processing || !!feedback}
                  onClick={() => submitAnswer(opt.key)}
                >
                  <span
                    className="quiz-option-key"
                    style={{ background: style.keyBg, color: '#fff' }}
                  >
                    {opt.key}
                  </span>
                  <span className="quiz-option-text">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {comboStreak >= 2 && (
            <p className="quiz-combo-hint">🔥 Chuỗi đúng: {comboStreak} (combo +{QUIZ_SCORING.comboBonus} ở câu {QUIZ_SCORING.comboStreak})</p>
          )}
        </div>

        {feedback && (
          <div className="feedback-overlay">
            <div
              className={`quiz-feedback quiz-feedback--${feedback.type === 'correct' ? 'correct' : feedback.type === 'timeout' ? 'timeout' : 'wrong'}`}
            >
              <p className="quiz-feedback__icon">
                {feedback.type === 'correct' ? '✅' : feedback.type === 'timeout' ? '⏱' : '❌'}
              </p>
              <h2 className="quiz-feedback__title">{feedback.title}</h2>
              <p className="quiz-feedback__text">{feedback.text}</p>
              {feedback.explanation &&
                (practice || feedback.type === 'correct' || feedback.type === 'wrong') && (
                <p className="quiz-feedback__explain">💡 {feedback.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </GameViewport>
  );
}

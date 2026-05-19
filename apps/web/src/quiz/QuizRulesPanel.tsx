import { QUIZ_HOW_TO_PLAY, QUIZ_RULES_SECTIONS, QUIZ_SCORING } from './constants';

interface QuizRulesPanelProps {
  /** Chỉ hiện tóm tắt (dùng trên admin) */
  compact?: boolean;
}

export function QuizRulesPanel({ compact = false }: QuizRulesPanelProps) {
  return (
    <div className={`quiz-rules ${compact ? 'quiz-rules--compact' : ''}`}>
      <h3 className="quiz-rules__title">📋 Thể lệ &amp; cách chơi</h3>

      {!compact && (
        <section className="quiz-rules__howto" aria-labelledby="quiz-howto-heading">
          <p id="quiz-howto-heading" className="quiz-rules__section-title">
            Cách chơi
          </p>
          <ol className="quiz-rules__steps">
            {QUIZ_HOW_TO_PLAY.map((s) => (
              <li key={s.step} className="quiz-rules__step">
                <span className="quiz-rules__step-num">{s.step}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {compact && (
        <p className="quiz-rules__summary">
          10 câu/lượt · 10 giây/câu · đúng +{QUIZ_SCORING.correct} / sai {QUIZ_SCORING.wrong} · combo
          +{QUIZ_SCORING.comboBonus} · hoàn thành +{QUIZ_SCORING.completionBonus}
        </p>
      )}

      {QUIZ_RULES_SECTIONS.map((section) => (
        <section key={section.title} className="quiz-rules__section">
          <p className="quiz-rules__section-title">{section.title}</p>
          <ul className="quiz-rules__list">
            {section.items.map((item) => (
              <li key={item.label} className={`quiz-rules__item quiz-rules__item--${item.tone}`}>
                <span className="quiz-rules__badge">{item.label}</span>
                <span className="quiz-rules__desc">{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!compact && (
        <p className="quiz-rules__note">
          💡 <strong>Luyện tập:</strong> chơi như bình thường nhưng xem giải thích sau mỗi câu để ôn tập.
        </p>
      )}
    </div>
  );
}

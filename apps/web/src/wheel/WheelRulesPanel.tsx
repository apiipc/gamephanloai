import { WHEEL_HOW_TO_PLAY, WHEEL_RULES_SECTIONS, WHEEL_TITLE } from './constants';

interface WheelRulesPanelProps {
  compact?: boolean;
}

export function WheelRulesPanel({ compact = false }: WheelRulesPanelProps) {
  return (
    <div className={`wheel-rules ${compact ? 'wheel-rules--compact' : ''}`}>
      <h3 className="wheel-rules__title">📋 Thể lệ {WHEEL_TITLE}</h3>

      {!compact && (
        <section className="wheel-rules__howto">
          <p className="wheel-rules__section-title">Luồng hoạt động</p>
          <ol className="wheel-rules__steps">
            {WHEEL_HOW_TO_PLAY.map((s) => (
              <li key={s.step} className="wheel-rules__step">
                <span className="wheel-rules__step-num">{s.step}</span>
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
        <p className="wheel-rules__summary">
          Lượt quay miễn phí mỗi ngày · nhiệm vụ thêm lượt · quay 3 lần nhận 1 lượt thưởng
        </p>
      )}

      {WHEEL_RULES_SECTIONS.map((section) => (
        <section key={section.title} className="wheel-rules__section">
          <p className="wheel-rules__section-title">{section.title}</p>
          <ul className="wheel-rules__list">
            {section.items.map((item) => (
              <li key={item.label} className={`wheel-rules__item wheel-rules__item--${item.tone}`}>
                <span className="wheel-rules__badge">{item.label}</span>
                <span className="wheel-rules__desc">{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!compact && (
        <p className="wheel-rules__note">
          💡 Phần thưởng vật phẩm và voucher do nhà trường trao — xem lịch sử quay để đối chiếu.
        </p>
      )}
    </div>
  );
}

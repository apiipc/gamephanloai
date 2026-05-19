export const QUIZ_TITLE = 'AI LÀ CHUYÊN GIA MÔI TRƯỜNG?';

export const QUIZ_SCORING = {
  correct: 10,
  wrong: -5,
  comboStreak: 3,
  comboBonus: 10,
  completionBonus: 20,
} as const;

/** Hướng dẫn từng bước — hiển thị trên màn chào quiz */
export const QUIZ_HOW_TO_PLAY = [
  {
    step: 1,
    title: 'Bắt đầu',
    desc: 'Nhấn «Bắt đầu chơi». Hệ thống chọn ngẫu nhiên 10 câu từ ngân hàng câu hỏi của trường.',
  },
  {
    step: 2,
    title: 'Trả lời',
    desc: 'Mỗi câu có 10 giây. Chọn một trong bốn đáp án A, B, C hoặc D. Hết giờ sẽ tự chuyển câu tiếp theo.',
  },
  {
    step: 3,
    title: 'Nhận điểm',
    desc: `Đúng +${QUIZ_SCORING.correct} điểm, sai ${QUIZ_SCORING.wrong} điểm. Đúng liên tiếp ${QUIZ_SCORING.comboStreak} câu được thưởng combo +${QUIZ_SCORING.comboBonus} điểm.`,
  },
  {
    step: 4,
    title: 'Kết thúc',
    desc: `Hoàn thành đủ 10 câu được thưởng thêm +${QUIZ_SCORING.completionBonus} điểm. Điểm cộng vào điểm xanh ⭐ và bảng xếp hạng lớp.`,
  },
] as const;

export const QUIZ_RULES_SECTIONS = [
  {
    title: 'Cấp độ câu hỏi',
    items: [
      { label: 'Dễ', desc: 'Nhận biết kiến thức cơ bản về môi trường, rác thải', tone: 'easy' as const },
      { label: 'Trung bình', desc: 'Hiểu biết và vận dụng vào tình huống đời sống', tone: 'medium' as const },
      { label: 'Khó', desc: 'Tư duy phản biện, xử lý tình huống thực tế', tone: 'hard' as const },
    ],
  },
  {
    title: 'Cơ chế tính điểm',
    items: [
      { label: 'Đúng', desc: `+${QUIZ_SCORING.correct} điểm mỗi câu`, tone: 'score' as const },
      { label: 'Sai', desc: `${QUIZ_SCORING.wrong} điểm mỗi câu`, tone: 'score' as const },
      {
        label: 'Combo',
        desc: `+${QUIZ_SCORING.comboBonus} điểm khi trả lời đúng ${QUIZ_SCORING.comboStreak} câu liên tiếp (có thể lặp lại)`,
        tone: 'combo' as const,
      },
      {
        label: 'Hoàn thành',
        desc: `+${QUIZ_SCORING.completionBonus} điểm thưởng khi làm hết cả lượt quiz`,
        tone: 'score' as const,
      },
    ],
  },
];

export const PROGRESS_ICONS = ['🌿', '♻️', '⚠️', '🗑️'] as const;

export type QuizDifficulty = 'Dễ' | 'Trung bình' | 'Khó';

export function questionDifficulty(index: number, total: number): QuizDifficulty {
  const ratio = (index + 1) / total;
  if (ratio <= 0.4) return 'Dễ';
  if (ratio <= 0.75) return 'Trung bình';
  return 'Khó';
}

export const OPTION_STYLES: Record<string, { border: string; bg: string; keyBg: string }> = {
  A: { border: '#86efac', bg: '#f0fdf4', keyBg: '#22c55e' },
  B: { border: '#93c5fd', bg: '#eff6ff', keyBg: '#3b82f6' },
  C: { border: '#fcd34d', bg: '#fffbeb', keyBg: '#f59e0b' },
  D: { border: '#d1d5db', bg: '#f9fafb', keyBg: '#9ca3af' },
};

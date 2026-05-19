import { FormEvent, useState } from 'react';
import { quizApi } from '../api/client';
import type { QuizQuestion } from '../types';

interface QuizQuestionBankProps {
  questions: QuizQuestion[];
  onChanged: () => void;
  onMessage: (msg: string) => void;
}

export function QuizQuestionBank({ questions, onChanged, onMessage }: QuizQuestionBankProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (q: QuizQuestion) => {
    const preview =
      q.question.length > 80 ? `${q.question.slice(0, 80)}…` : q.question;
    if (!confirm(`Xóa câu hỏi:\n"${preview}"?`)) return;
    setDeletingId(q.id);
    try {
      await quizApi.deleteQuestion(q.id);
      onMessage('Đã xóa câu hỏi');
      if (editingId === q.id) setEditingId(null);
      onChanged();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Không xóa được');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="quiz-bank">
      <p className="quiz-bank__count">Ngân hàng câu hỏi ({questions.length})</p>

      <div className="quiz-bank__list">
        {questions.map((q, idx) => (
          <article key={q.id} className="quiz-bank__item">
            <div className="quiz-bank__item-head">
              <span className="quiz-bank__num">#{idx + 1}</span>
              <p className="quiz-bank__question">{q.question}</p>
              <div className="quiz-bank__actions">
                <button
                  type="button"
                  className="btn btn-secondary quiz-bank__btn"
                  onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                >
                  {editingId === q.id ? 'Đóng' : 'Sửa'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary quiz-bank__btn quiz-bank__btn--danger"
                  disabled={deletingId === q.id}
                  onClick={() => handleDelete(q)}
                >
                  {deletingId === q.id ? '…' : 'Xóa'}
                </button>
              </div>
            </div>

            <ul className="quiz-bank__options">
              {(
                [
                  ['A', q.optionA],
                  ['B', q.optionB],
                  ['C', q.optionC],
                  ['D', q.optionD],
                ] as const
              ).map(([key, text]) => (
                <li
                  key={key}
                  className={`quiz-bank__option ${q.correctOption === key ? 'quiz-bank__option--correct' : ''}`}
                >
                  <span className="quiz-bank__option-key">{key}</span>
                  <span>{text}</span>
                  {q.correctOption === key && (
                    <span className="quiz-bank__correct-tag">Đúng</span>
                  )}
                </li>
              ))}
            </ul>

            {q.explanation && (
              <p className="quiz-bank__explain">
                <strong>Giải thích:</strong> {q.explanation}
              </p>
            )}

            {editingId === q.id && (
              <EditQuestionForm
                question={q}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  onMessage('Đã cập nhật câu hỏi');
                  onChanged();
                }}
                onError={(m) => onMessage(m)}
              />
            )}
          </article>
        ))}
      </div>

      {questions.length === 0 && (
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Chưa có câu hỏi. Thêm thủ công hoặc upload Excel.</p>
      )}
    </div>
  );
}

function EditQuestionForm({
  question,
  onCancel,
  onSaved,
  onError,
}: {
  question: QuizQuestion;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await quizApi.updateQuestion(question.id, {
        question: fd.get('question'),
        optionA: fd.get('optionA'),
        optionB: fd.get('optionB'),
        optionC: fd.get('optionC'),
        optionD: fd.get('optionD'),
        correctOption: fd.get('correct'),
        explanation: fd.get('explanation') || undefined,
      });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="quiz-bank__edit" onSubmit={handleSubmit}>
      <p className="quiz-bank__edit-title">Chỉnh sửa câu hỏi</p>
      <textarea
        name="question"
        required
        rows={2}
        defaultValue={question.question}
        placeholder="Câu hỏi"
      />
      <div className="quiz-bank__edit-grid">
        <input name="optionA" required defaultValue={question.optionA} placeholder="Đáp án A" />
        <input name="optionB" required defaultValue={question.optionB} placeholder="Đáp án B" />
        <input name="optionC" required defaultValue={question.optionC} placeholder="Đáp án C" />
        <input name="optionD" required defaultValue={question.optionD} placeholder="Đáp án D" />
      </div>
      <select name="correct" required defaultValue={question.correctOption}>
        <option value="A">Đáp án đúng: A</option>
        <option value="B">Đáp án đúng: B</option>
        <option value="C">Đáp án đúng: C</option>
        <option value="D">Đáp án đúng: D</option>
      </select>
      <input
        name="explanation"
        defaultValue={question.explanation ?? ''}
        placeholder="Giải thích (tùy chọn)"
      />
      <div className="quiz-bank__edit-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

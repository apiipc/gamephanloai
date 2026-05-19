import { useRef, useState } from 'react';
import { downloadQuizTemplate, parseQuizExcel } from './quizExcel';
import type { QuizImportRow } from './quizExcel';

interface QuizExcelUploadProps {
  onImport: (items: QuizImportRow[]) => Promise<{ created: number; total: number }>;
  onMessage: (msg: string) => void;
}

export function QuizExcelUpload({ onImport, onMessage }: QuizExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const items = await parseQuizExcel(file);
      const res = await onImport(items);
      onMessage(`Đã import ${res.created}/${res.total} câu từ Excel`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file Excel');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="card quiz-excel-upload">
      <h3 style={{ marginBottom: 8 }}>Upload file Excel</h3>
      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12, lineHeight: 1.45 }}>
        Tải file mẫu, điền câu hỏi và đáp án A–D, chọn đáp án đúng (A/B/C/D), rồi upload lại.
      </p>

      <div className="quiz-excel-upload__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadQuizTemplate()}
        >
          ⬇ Tải file mẫu (.xlsx)
        </button>
        <label className={`btn btn-primary quiz-excel-upload__pick ${uploading ? 'disabled' : ''}`}>
          {uploading ? 'Đang xử lý…' : '📤 Chọn file Excel'}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            disabled={uploading}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {error && (
        <p className="quiz-excel-upload__error" role="alert">
          {error}
        </p>
      )}

      <details className="quiz-excel-upload__help">
        <summary>Cấu trúc cột trong file mẫu</summary>
        <ul>
          <li>
            <strong>Câu hỏi</strong> — nội dung câu hỏi
          </li>
          <li>
            <strong>Đáp án A–D</strong> — bốn lựa chọn
          </li>
          <li>
            <strong>Đáp án đúng</strong> — chỉ nhập A, B, C hoặc D
          </li>
          <li>
            <strong>Giải thích</strong> — tùy chọn, hiện khi luyện tập
          </li>
        </ul>
      </details>
    </div>
  );
}

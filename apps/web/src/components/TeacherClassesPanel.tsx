import { useEffect, useState } from 'react';
import { adminApi } from '../api/client';

interface AdminClass {
  id: string;
  name: string;
  teacher?: { fullName: string } | null;
  _count?: { students: number };
}

interface TeacherClassesPanelProps {
  onSelectClass?: (classId: string, className: string) => void;
  selectedClassId?: string | null;
}

export function TeacherClassesPanel({
  onSelectClass,
  selectedClassId,
}: TeacherClassesPanelProps) {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .classes()
      .then((list) => {
        const arr = list as AdminClass[];
        setClasses(arr);
        if (arr.length > 0 && onSelectClass && !selectedClassId) {
          onSelectClass(arr[0].id, arr[0].name);
        }
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [onSelectClass, selectedClassId]);

  if (loading) {
    return <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Đang tải danh sách lớp…</p>;
  }

  if (classes.length === 0) {
    return (
      <div className="card teacher-classes">
        <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: 14 }}>
          Chưa có lớp nào trong phạm vi quản lý. Liên hệ quản trị trường để gắn bạn làm GVCN các lớp,
          hoặc đảm bảo đã có học sinh trong trường.
        </p>
      </div>
    );
  }

  return (
    <div className="teacher-classes card">
      <h3 className="teacher-classes__title">📚 Lớp bạn quản lý ({classes.length})</h3>
      <ul className="teacher-classes__list">
        {classes.map((c) => (
          <li key={c.id}>
            {onSelectClass ? (
              <button
                type="button"
                className={`teacher-classes__btn ${selectedClassId === c.id ? 'teacher-classes__btn--active' : ''}`}
                onClick={() => onSelectClass(c.id, c.name)}
              >
                <strong>{c.name}</strong>
                <span>{c._count?.students ?? 0} học sinh</span>
              </button>
            ) : (
              <div className="teacher-classes__item">
                <strong>{c.name}</strong>
                <span>{c._count?.students ?? 0} học sinh</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

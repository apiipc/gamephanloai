import { useEffect, useState } from 'react';
import { adminApi } from '../api/client';

interface AdminClassRow {
  id: string;
  name: string;
  teacher?: { id: string; fullName: string } | null;
  _count?: { students: number };
}

interface TeacherOption {
  id: string;
  fullName: string;
}

interface ClassTeacherAssignPanelProps {
  teachers: TeacherOption[];
  dataVersion?: number;
  onMessage: (msg: string) => void;
  onChanged?: () => void;
}

export function ClassTeacherAssignPanel({
  teachers,
  dataVersion = 0,
  onMessage,
  onChanged,
}: ClassTeacherAssignPanelProps) {
  const [classes, setClasses] = useState<AdminClassRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .classes()
      .then((list) => {
        const rows = list as AdminClassRow[];
        setClasses(rows);
        const next: Record<string, string> = {};
        for (const c of rows) {
          next[c.id] = c.teacher?.id ?? '';
        }
        setDraft(next);
      })
      .catch(() => {
        setClasses([]);
        setDraft({});
      })
      .finally(() => setLoading(false));
  }, [dataVersion]);

  const save = async (classId: string, className: string) => {
    const teacherId = draft[classId] || null;
    const current = classes.find((c) => c.id === classId)?.teacher?.id ?? '';
    if ((teacherId || '') === (current || '')) {
      onMessage(`Lớp ${className}: không có thay đổi`);
      return;
    }
    setSavingId(classId);
    try {
      await adminApi.updateClass(classId, { teacherId });
      onMessage(
        teacherId
          ? `Đã gán GVCN cho lớp ${className}`
          : `Đã bỏ GVCN khỏi lớp ${className}`,
      );
      onChanged?.();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16 }}>
        Đang tải danh sách lớp…
      </p>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-600)' }}>
          Chưa có lớp nào. Import học sinh từ Excel hoặc tạo HS với tên lớp để hệ thống tạo lớp.
        </p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>📚 Gán giáo viên chủ nhiệm (GVCN)</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-600)' }}>
          Chưa có tài khoản giáo viên (GV). Tạo hoặc import GV trước, sau đó gán vào từng lớp.
        </p>
      </div>
    );
  }

  return (
    <div className="card user-admin__table-wrap" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>📚 Gán giáo viên chủ nhiệm (GVCN)</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
        Giáo viên chỉ thấy và quản lý các lớp đã được gán ở đây.
      </p>
      <table className="wheel-admin__table">
        <thead>
          <tr>
            <th>Lớp</th>
            <th>HS</th>
            <th>GVCN hiện tại</th>
            <th>Gán GVCN</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.name}</strong>
              </td>
              <td>{c._count?.students ?? 0}</td>
              <td>{c.teacher?.fullName ?? '—'}</td>
              <td>
                <select
                  value={draft[c.id] ?? ''}
                  style={{ width: '100%', maxWidth: 220, padding: '6px 8px', borderRadius: 8 }}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [c.id]: e.target.value }))
                  }
                  aria-label={`GVCN lớp ${c.name}`}
                >
                  <option value="">— Chưa gán —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-secondary wheel-admin__btn-sm"
                  disabled={savingId === c.id}
                  onClick={() => save(c.id, c.name)}
                >
                  {savingId === c.id ? 'Đang lưu…' : 'Lưu'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

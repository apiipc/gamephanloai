import { FormEvent, useEffect, useRef, useState } from 'react';
import { adminApi } from '../api/client';
import { downloadUserTemplate, parseUserExcel } from '../admin/userExcel';
import type { Role } from '../types';

interface AdminClass {
  id: string;
  name: string;
}

interface UserAdminPanelProps {
  users: { id: string; fullName: string; email: string; role: Role }[];
  actorRole: Role;
  onMessage: (msg: string) => void;
  onChanged: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: 'STUDENT', label: 'Học sinh (HS)', hint: 'Chơi game, quiz, vòng quay' },
  { value: 'TEACHER', label: 'Giáo viên (GV)', hint: 'Xem HS lớp mình, quản quiz' },
  { value: 'ORG_ADMIN', label: 'Quản trị trường', hint: 'Quản lý toàn trường' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', hint: 'Toàn hệ thống' },
];

export function UserAdminPanel({ users, actorRole, onMessage, onChanged }: UserAdminPanelProps) {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [formRole, setFormRole] = useState<Role>('STUDENT');
  const [formError, setFormError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    adminApi
      .classes()
      .then((list) => setClasses(list as AdminClass[]))
      .catch(() => setClasses([]));
  }, []);

  const allowedRoles = ROLE_OPTIONS.filter((r) => {
    if (actorRole === 'TEACHER') return r.value === 'STUDENT';
    if (actorRole === 'ORG_ADMIN') return r.value !== 'SUPER_ADMIN';
    return true;
  });

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const formEl = formRef.current ?? e.currentTarget;
    const fd = new FormData(formEl);
    const fullName = String(fd.get('fullName') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');
    const className = String(fd.get('className') ?? '').trim();

    if (!fullName) {
      setFormError('Vui lòng nhập họ tên');
      return;
    }
    if (!email || !email.includes('@')) {
      setFormError('Email không hợp lệ');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (formRole === 'STUDENT' && !className) {
      setFormError('Học sinh cần nhập lớp (VD: 12A2)');
      return;
    }

    setSaving(true);
    try {
      await adminApi.createUser({
        fullName,
        email,
        password,
        role: formRole,
        ...(formRole === 'STUDENT' ? { className } : {}),
      });
      formEl.reset();
      setFormRole('STUDENT');
      setFormError('');
      onMessage(`Đã tạo tài khoản ${email}`);
      onChanged();
      adminApi
        .classes()
        .then((list) => setClasses(list as AdminClass[]))
        .catch(() => setClasses([]));
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Không tạo được';
      setFormError(text);
      onMessage(text);
    } finally {
      setSaving(false);
    }
  };

  const handleExcel = async (file: File) => {
    setExcelError('');
    setUploading(true);
    try {
      const items = await parseUserExcel(file);
      const res = await adminApi.importUsers(items);
      const errLines = res.errors
        .slice(0, 3)
        .map((x) => `Dòng ${x.row} (${x.email}): ${x.message}`)
        .join(' · ');
      onMessage(
        `Import: ${res.created} mới, ${res.updated} cập nhật` +
          (res.removed ? `, ${res.removed} HS đã xóa (không còn trong file)` : '') +
          (res.classesRemoved ? `, ${res.classesRemoved} lớp trống đã xóa` : '') +
          (res.failed ? ` — ${res.failed} lỗi${errLines ? `: ${errLines}` : ''}` : ''),
      );
      adminApi
        .classes()
        .then((list) => setClasses(list as AdminClass[]))
        .catch(() => setClasses([]));
      onChanged();
    } catch (e) {
      setExcelError(e instanceof Error ? e.message : 'Không đọc được file');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="user-admin">
      <div className="card user-admin__block">
        <h3 className="user-admin__title">➕ Tạo tài khoản mới</h3>
        <p className="user-admin__desc">
          Tạo một học sinh / giáo viên / quản trị. Mật khẩu tối thiểu 6 ký tự.
        </p>
        <form ref={formRef} className="user-admin__form" onSubmit={handleCreate}>
          <label className="user-admin__field">
            <span>Họ tên *</span>
            <input name="fullName" required placeholder="Nguyễn Văn An" />
          </label>
          <label className="user-admin__field">
            <span>Email *</span>
            <input name="email" type="email" required placeholder="email@truong.edu.vn" />
          </label>
          <label className="user-admin__field">
            <span>Mật khẩu *</span>
            <input name="password" type="password" required minLength={6} placeholder="123456" />
          </label>
          <label className="user-admin__field">
            <span>Vai trò *</span>
            <select
              name="role"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as Role)}
              required
            >
              {allowedRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {formRole === 'STUDENT' && (
            <label className="user-admin__field">
              <span>Lớp *</span>
              <input
                name="className"
                required
                placeholder="VD: 6A1, 7B3…"
                list="admin-class-suggestions"
                autoComplete="off"
              />
              <datalist id="admin-class-suggestions">
                {classes.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
          )}
          {formError && (
            <p className="quiz-excel-upload__error" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </form>
      </div>

      <div className="card user-admin__block quiz-excel-upload">
        <h3 className="user-admin__title">📤 Nhập danh sách từ Excel</h3>
        <p className="user-admin__desc">
          Tải file mẫu, điền danh sách <strong>đầy đủ</strong> rồi upload. Học sinh có trong file
          được tạo/cập nhật; HS <strong>không còn trong file</strong> sẽ bị xóa; lớp không còn HS
          sẽ được gỡ. Cột <strong>Vai trò</strong>: HS, GV hoặc Admin.
        </p>
        <div className="quiz-excel-upload__actions">
          <button type="button" className="btn btn-secondary" onClick={() => downloadUserTemplate()}>
            ⬇ Tải file mẫu (.xlsx)
          </button>
          <label className={`btn btn-primary quiz-excel-upload__pick ${uploading ? 'disabled' : ''}`}>
            {uploading ? 'Đang import…' : '📂 Chọn file Excel'}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleExcel(f);
              }}
            />
          </label>
        </div>
        {excelError && (
          <p className="quiz-excel-upload__error" role="alert">
            {excelError}
          </p>
        )}
        <details className="quiz-excel-upload__help">
          <summary>Cấu trúc cột file mẫu</summary>
          <ul>
            <li>
              <strong>Họ tên</strong> — tên hiển thị
            </li>
            <li>
              <strong>Email</strong> — không trùng tài khoản có sẵn
            </li>
            <li>
              <strong>Mật khẩu</strong> — tối thiểu 6 ký tự
            </li>
            <li>
              <strong>Vai trò</strong> — HS / GV / Admin (hoặc STUDENT, TEACHER, ORG_ADMIN)
            </li>
            <li>
              <strong>Lớp</strong> — bắt buộc với HS (VD: 6A1), để trống với GV
            </li>
          </ul>
        </details>
      </div>

      <p className="user-admin__count">
        Đang có <strong>{users.length}</strong> tài khoản trong phạm vi bạn xem được.
      </p>
    </div>
  );
}

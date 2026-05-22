import { FormEvent, useState } from 'react';
import { authApi } from '../api/client';

export function ChangePasswordCard() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get('currentPassword') ?? '');
    const newPassword = String(fd.get('newPassword') ?? '');
    const confirm = String(fd.get('confirmPassword') ?? '');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirm) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      e.currentTarget.reset();
      setSuccess('Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card change-password-card" style={{ marginBottom: 16 }}>
      <h3 className="change-password-card__title">🔐 Đổi mật khẩu</h3>
      <p className="change-password-card__desc">
        Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự).
      </p>
      <form className="change-password-card__form" onSubmit={handleSubmit}>
        <label className="user-admin__field">
          <span>Mật khẩu hiện tại *</span>
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label className="user-admin__field">
          <span>Mật khẩu mới *</span>
          <input
            name="newPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <label className="user-admin__field">
          <span>Nhập lại mật khẩu mới *</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p className="change-password-card__error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="change-password-card__success" role="status">
            {success}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    </div>
  );
}

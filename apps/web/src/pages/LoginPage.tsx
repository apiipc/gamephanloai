import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_USER_PASSWORD } from '../lib/defaultPassword';
import { startGameMusic } from '../lib/gameMusic';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      startGameMusic();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>♻️ Phân Loại Siêu Tốc</h1>
        <p>Đăng nhập để chơi game và tích điểm xanh</p>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="login-forgot">
          <button
            type="button"
            className="login-forgot__toggle"
            onClick={() => setShowForgot((v) => !v)}
          >
            {showForgot ? '▲ Ẩn' : '▼'} Quên mật khẩu?
          </button>
          {showForgot && (
            <div className="login-forgot__panel">
              <p>
                Liên hệ <strong>giáo viên</strong> hoặc <strong>quản trị trường</strong> để được cấp
                lại mật khẩu. Họ vào <strong>Quản trị → Tổng quan</strong>, nhấn{' '}
                <strong>Reset MK</strong> trên tài khoản của bạn — mật khẩu trở về mặc định{' '}
                <strong>{DEFAULT_USER_PASSWORD}</strong>, sau đó bạn đăng nhập và đổi mật khẩu tại{' '}
                <strong>Hồ sơ → Đổi mật khẩu</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

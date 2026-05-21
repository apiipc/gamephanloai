import { useAuth } from '../context/AuthContext';
import { useGlobalBgm } from '../hooks/useGlobalBgm';

/** Bật nhạc nền toàn app khi đã đăng nhập */
export function GlobalBgm() {
  const { user } = useAuth();
  useGlobalBgm(Boolean(user));
  return null;
}

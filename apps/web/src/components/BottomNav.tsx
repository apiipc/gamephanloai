import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const { isAdmin } = useAuth();

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <span>🏠</span>
        <span>Trang chủ</span>
      </NavLink>
      <NavLink to="/missions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>🎯</span>
        <span>Nhiệm vụ</span>
      </NavLink>
      <NavLink to="/play" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>🎮</span>
        <span>Game</span>
      </NavLink>
      <NavLink to="/leaderboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>📊</span>
        <span>Xếp hạng</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>👤</span>
        <span>Hồ sơ</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>⚙️</span>
          <span>Quản trị</span>
        </NavLink>
      )}
    </nav>
  );
}

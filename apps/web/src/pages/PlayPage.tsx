import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { playSound } from '../lib/sounds';

const GAMES = [
  {
    id: 'sort',
    title: 'Phân loại siêu tốc',
    desc: 'Kéo rác vào thùng đúng loại — 45 giây',
    icon: '♻️',
    bg: 'linear-gradient(180deg, #ecfdf5, #fff)',
    path: '/game',
    active: true,
  },
  {
    id: 'quiz',
    title: 'AI là chuyên gia môi trường?',
    desc: '10 câu · 10 giây/câu · combo & điểm thưởng',
    icon: '🧠',
    bg: 'linear-gradient(180deg, #ede9fe, #fff)',
    path: '/quiz',
    active: true,
  },
  {
    id: 'wheel',
    title: 'Vòng Quay Xanh',
    desc: 'Quay trúng điểm, quà xanh & lượt quay thêm',
    icon: '🎡',
    bg: 'linear-gradient(180deg, #d1fae5, #fff)',
    path: '/wheel',
    active: true,
  },
];

export default function PlayPage() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <div className="page">
        <h2 style={{ marginBottom: 8 }}>🎮 Mini Game</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
          CHƠI GAME NHẬN ĐIỂM XANH
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className="card play-game-card"
              style={{ background: g.bg, textAlign: 'left', width: '100%' }}
              onClick={() => {
                if (!g.active) return;
                playSound('click');
                navigate(g.path);
              }}
              disabled={!g.active}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 40 }}>{g.icon}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>{g.title}</strong>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{g.desc}</span>
                </div>
                <span style={{ fontSize: 18, color: 'var(--gray-500)' }}>›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

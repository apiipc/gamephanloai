import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wheelApi } from '../api/client';
import { GameViewport } from '../components/GameViewport';
import type { WheelHistoryEntry } from '../types';
import { WHEEL_PRIZE_LABEL } from '../wheel/constants';

type Tab = 'all' | 'points' | 'other';

export default function WheelHistoryPage() {
  const [rows, setRows] = useState<WheelHistoryEntry[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wheelApi
      .history(80)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    if (tab === 'all') return true;
    if (tab === 'points') return r.prizeType === 'POINTS';
    return r.prizeType !== 'POINTS';
  });

  return (
    <GameViewport>
      <div className="app-shell app-shell--game wheel-history-shell">
        <header className="wheel-history-header">
          <Link to="/wheel" className="quiz-back">
            ← Vòng quay
          </Link>
          <h1>Lịch sử quay</h1>
        </header>

        <div className="wheel-history-tabs">
          <button
            type="button"
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={tab === 'points' ? 'active' : ''}
            onClick={() => setTab('points')}
          >
            Điểm / lượt
          </button>
          <button
            type="button"
            className={tab === 'other' ? 'active' : ''}
            onClick={() => setTab('other')}
          >
            Quà khác
          </button>
        </div>

        {loading && <p className="wheel-history-loading">Đang tải…</p>}

        <ul className="wheel-history-list">
          {filtered.map((r) => (
            <li key={r.id} className="wheel-history-item">
              <div>
                <strong>{r.prizeName}</strong>
                <span className="wheel-history-item__type">
                  {WHEEL_PRIZE_LABEL[r.prizeType]}
                </span>
              </div>
              <time dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleString('vi-VN')}
              </time>
            </li>
          ))}
        </ul>

        {!loading && filtered.length === 0 && (
          <p className="wheel-history-empty">Chưa có lượt quay nào.</p>
        )}
      </div>
    </GameViewport>
  );
}

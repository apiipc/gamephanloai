import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wheelApi } from '../api/client';
import { GameViewport } from '../components/GameViewport';
import { WheelMissionsDrawer } from '../components/WheelMissionsDrawer';
import { WheelSpin } from '../components/WheelSpin';
import type { WheelSpinResult, WheelState } from '../types';
import { GameAudioHud } from '../components/GameAudioHud';
import { useGameMusic } from '../hooks/useGameMusic';
import { playSound } from '../lib/sounds';
import { WHEEL_PRIZE_LABEL } from '../wheel/constants';

export default function WheelPage() {
  const [state, setState] = useState<WheelState | null>(null);
  const [error, setError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [result, setResult] = useState<WheelSpinResult | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const s = await wheelApi.state();
    setState(s);
    return s;
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Không tải được'));
  }, [load]);

  useGameMusic('wheel', Boolean(state));

  const handleSpin = async () => {
    if (!state || spinning || state.spinsRemaining <= 0) return;
    setSpinning(true);
    setError('');
    playSound('spin');
    try {
      const res = await wheelApi.spin();
      const idx = state.prizes.findIndex((p) => p.id === res.prize.id);
      const n = state.prizes.length || 8;
      const seg = 360 / n;
      const i = idx >= 0 ? idx : 0;
      const extra = 360 * 6;
      const target = extra + (360 - i * seg - seg / 2);
      setRotationDeg((prev) => prev + target - (prev % 360));
      await new Promise((r) => setTimeout(r, 4200));
      setResult(res);
      playSound('win');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không quay được');
    } finally {
      setSpinning(false);
    }
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await wheelApi.claimMission(id);
      setToast('Đã nhận lượt quay thưởng!');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setClaimingId(null);
    }
  };

  const bonusPct = state
    ? Math.min(100, (state.spinsTowardBonus / state.bonusEverySpins) * 100)
    : 0;

  return (
    <GameViewport>
      <div className="app-shell app-shell--game wheel-play-shell">
        <header className="wheel-play-header">
          <Link to="/wheel" className="wheel-play-header__back">
            ←
          </Link>
          <div className="wheel-play-header__spins">
            <span className="wheel-play-header__label">Lượt quay</span>
            <strong>{state?.spinsRemaining ?? 0}</strong>
          </div>
          <div className="wheel-play-header__right">
            <GameAudioHud className="wheel-play-header__sound" />
            <Link to="/wheel/history" className="wheel-play-header__history">
              Lịch sử
            </Link>
          </div>
        </header>

        {error && <p className="wheel-play-error">{error}</p>}
        {toast && (
          <p className="wheel-play-toast" onAnimationEnd={() => setToast('')}>
            {toast}
          </p>
        )}

        {state && (
          <>
            <WheelSpin
              prizes={state.prizes}
              rotationDeg={rotationDeg}
              spinning={spinning}
              disabled={state.spinsRemaining <= 0}
              onSpin={handleSpin}
            />

            <div className="wheel-bonus-progress">
              <p>
                Quay <strong>{state.bonusEverySpins}</strong> lần nhận thêm{' '}
                <strong>1</strong> lượt quay
              </p>
              <div className="wheel-bonus-progress__track">
                <div
                  className="wheel-bonus-progress__fill"
                  style={{ width: `${bonusPct}%` }}
                />
              </div>
              <span className="wheel-bonus-progress__count">
                {state.spinsTowardBonus} / {state.bonusEverySpins}
              </span>
            </div>

            <button
              type="button"
              className="wheel-missions-trigger"
              onClick={() => setDrawerOpen(true)}
            >
              🎯 Nhiệm vụ hằng ngày
            </button>
          </>
        )}

        {!state && !error && <p className="wheel-play-loading">Đang tải vòng quay…</p>}

        <WheelMissionsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          missions={state?.missions ?? []}
          onClaim={handleClaim}
          claimingId={claimingId}
        />

        {result && (
          <div className="wheel-result-backdrop" role="presentation">
            <div className="wheel-result" role="dialog">
              <p className="wheel-result__tag">CHÚC MỪNG!</p>
              <p className="wheel-result__icon">{result.prize.icon ?? '🎁'}</p>
              <h2 className="wheel-result__name">{result.prize.name}</h2>
              <p className="wheel-result__type">
                {WHEEL_PRIZE_LABEL[result.prize.type] ?? result.prize.type}
              </p>
              {result.bonusGranted && (
                <p className="wheel-result__bonus">🎉 Thêm 1 lượt quay thưởng!</p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setResult(null)}
              >
                Nhận quà
              </button>
            </div>
          </div>
        )}
      </div>
    </GameViewport>
  );
}

import type { WheelPrizeSegment } from '../types';

interface WheelSpinProps {
  prizes: WheelPrizeSegment[];
  rotationDeg: number;
  spinning: boolean;
  disabled: boolean;
  onSpin: () => void;
}

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 94;
const LABEL_R = 58;

/** Góc độ (0° = phải, -90° = đỉnh vòng) → tọa độ SVG */
function polar(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

/** Vẽ một ô quạt từ startDeg → endDeg (theo chiều kim đồng hồ) */
function wedgePath(startDeg: number, endDeg: number) {
  const start = polar(startDeg, RADIUS);
  const end = polar(endDeg, RADIUS);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function WheelSpin({ prizes, rotationDeg, spinning, disabled, onSpin }: WheelSpinProps) {
  const n = prizes.length || 1;
  const segment = 360 / n;

  return (
    <div className="wheel-spin">
      <div className="wheel-spin__pointer" aria-hidden>
        ▼
      </div>

      <div className="wheel-spin__stage">
        <svg
          className={`wheel-spin__svg ${spinning ? 'wheel-spin__svg--spinning' : ''}`}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: `rotate(${rotationDeg}deg)` }}
          aria-hidden
        >
          <circle cx={CX} cy={CY} r={RADIUS + 2} fill="#fff" />
          <g>
            {prizes.map((p, i) => {
              const startDeg = i * segment - 90;
              const endDeg = (i + 1) * segment - 90;
              const midDeg = startDeg + segment / 2;
              const label = polar(midDeg, LABEL_R);
              return (
                <g key={p.id}>
                  <path
                    d={wedgePath(startDeg, endDeg)}
                    fill={p.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <g transform={`translate(${label.x}, ${label.y}) rotate(${midDeg + 90})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="wheel-spin__svg-text"
                    >
                      <tspan x={0} dy="-0.55em" className="wheel-spin__svg-icon">
                        {p.icon ?? '🎁'}
                      </tspan>
                      <tspan x={0} dy="1.15em" className="wheel-spin__svg-name">
                        {p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name}
                      </tspan>
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
          <circle cx={CX} cy={CY} r={36} fill="#fff" />
        </svg>

        <button
          type="button"
          className="wheel-spin__btn"
          disabled={disabled || spinning}
          onClick={onSpin}
        >
          QUAY
        </button>
      </div>
    </div>
  );
}

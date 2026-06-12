const MOCK_HISTORY = [
  { day: 'Mon', newPrice: 250 },
  { day: 'Tue', newPrice: 265 },
  { day: 'Wed', newPrice: 275 },
  { day: 'Thu', newPrice: 290 },
  { day: 'Fri', newPrice: 280 },
  { day: 'Sat', newPrice: 300 },
  { day: 'Sun', newPrice: 308 },
];

function trendBadge(prices) {
  const last = prices[prices.length - 1];
  const first = prices[0];
  const prev = prices.length >= 2 ? prices[prices.length - 2] : first;
  if (last > first) return { label: '\u2191 Rising', cls: 'trend-up', color: '#16a34a' };
  if (last < first) return { label: '\u2193 Falling', cls: 'trend-down', color: '#dc2626' };
  return { label: '\u2192 Stable', cls: 'trend-flat', color: '#64748b' };
}

export default function PriceHistoryGraph({ entityType, entityId }) {
  const history = MOCK_HISTORY;

  const prices = history.map(h => Number(h.newPrice));
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const lastPrice = prices[prices.length - 1];
  const trend = trendBadge(prices);

  const W = 320, H = 78, PAD = { t: 10, r: 8, b: 18, l: 30 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const xStep = chartW / Math.max(prices.length - 1, 1);

  const linePoints = prices.map((p, i) => {
    const x = PAD.l + i * xStep;
    const y = PAD.t + (1 - (p - minP) / range) * chartH;
    return { x, y };
  });

  const polylinePoints = linePoints.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${PAD.l},${H - PAD.b}`,
    ...linePoints.map(p => `${p.x},${p.y}`),
    `${PAD.l + (prices.length - 1) * xStep},${H - PAD.b}`,
  ].join(' ');

  const gradId = `pricing-grad-${entityType}-${entityId}`;

  return (
    <div className="price-history-card">
      <div className="price-history-header">
        <span className="price-history-title">\uD83D\uDCC8 Price History (7d)</span>
        <span className={`price-history-trend ${trend.cls}`}>{trend.label}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="price-history-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trend.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={trend.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={PAD.l} y1={PAD.t} x2={PAD.l + chartW} y2={PAD.t} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + chartH / 2} x2={PAD.l + chartW} y2={PAD.t + chartH / 2} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={PAD.l} y1={H - PAD.b} x2={PAD.l + chartW} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth="1" />

        <text x={PAD.l - 4} y={PAD.t + 3} textAnchor="end" className="price-chart-ylabel">${maxP.toFixed(0)}</text>
        <text x={PAD.l - 4} y={PAD.t + chartH / 2 + 3} textAnchor="end" className="price-chart-ylabel">
          ${((maxP + minP) / 2).toFixed(0)}
        </text>
        <text x={PAD.l - 4} y={H - PAD.b + 3} textAnchor="end" className="price-chart-ylabel">${minP.toFixed(0)}</text>

        <polygon fill={`url(#${gradId})`} points={areaPoints} />

        <polyline fill="none" stroke={trend.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          points={polylinePoints} />

        {linePoints.map((pt, i) => {
          const isLast = i === prices.length - 1;
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={isLast ? 4 : 2.5}
                fill={isLast ? trend.color : '#fff'}
                stroke={trend.color}
                strokeWidth={isLast ? 1.5 : 1} />
              {isLast && (
                <circle cx={pt.x} cy={pt.y} r="7" fill="none" stroke={trend.color} strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
              )}
            </g>
          );
        })}

        {history.map((h, i) => (
          <text key={i} x={PAD.l + i * xStep} y={H - 3} textAnchor="middle" className="price-chart-xlabel">
            {h.day}
          </text>
        ))}

        {linePoints.map((pt, i) => (
          <text key={i} x={pt.x} y={pt.y - 6} textAnchor="middle" className="price-chart-dotlabel">
            ${prices[i].toFixed(0)}
          </text>
        ))}
      </svg>

      <div className="price-history-current">
        <span className="price-current-label">Current Price</span>
        <span className="price-current-value" style={{ color: trend.color }}>${Number(lastPrice).toFixed(2)}</span>
      </div>
    </div>
  );
}

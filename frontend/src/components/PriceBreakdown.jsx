import { useState, useEffect } from 'react';

function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function factorBadge(factor) {
  const map = {
    demand: 'factor-badge-surge',
    seasonal: 'factor-badge-seasonal',
    holiday: 'factor-badge-seasonal',
    weekend: 'factor-badge-seasonal',
    lastMinute: 'factor-badge-surge',
  };
  return map[factor] || 'factor-badge-other';
}

function factorIcon(factor) {
  const map = {
    demand: '\uD83D\uDCC8',
    seasonal: '\uD83C\uDF26\uFE0F',
    holiday: '\uD83C\uDF89',
    weekend: '\uD83C\uDF06',
    lastMinute: '\u23F3',
  };
  return map[factor] || '\uD83D\uDCCC';
}

export default function PriceBreakdown({ pricing, frozen }) {
  if (!pricing) return null;
  const { basePrice, finalPrice, breakdown } = pricing;

  const totalIncrease = finalPrice - basePrice;
  const increasePct = basePrice > 0 ? ((totalIncrease / basePrice) * 100).toFixed(0) : '0';

  return (
    <div className="dynamic-pricing-card">
      <div className="dynamic-pricing-header">
        <span className="dynamic-pricing-title">
          <span className="pricing-header-icon">\uD83D\uDCCA</span>
          Dynamic Pricing
        </span>
        <span className="pricing-live-badge">\u26A1 Live</span>
      </div>

      <div className="pricing-table">
        <div className="pricing-row">
          <span className="pricing-label pricing-label-base">
            <span className="pricing-bullet pricing-bullet-base" />
            Base Price
          </span>
          <span className="pricing-value pricing-value-base">${Number(basePrice).toFixed(2)}</span>
        </div>

        {breakdown.map((b) => (
          <div key={b.factor} className="pricing-row pricing-adjustment">
            <span className="pricing-label">
              <span className={`factor-badge ${factorBadge(b.factor)}`}>
                {factorIcon(b.factor)} {b.adjustmentReason}
              </span>
            </span>
            <span className="pricing-value pricing-adjustment-value">
              +${b.amount.toFixed(2)}
              {basePrice > 0 && (
                <span className="pricing-pct">+{((b.amount / basePrice) * 100).toFixed(0)}%</span>
              )}
            </span>
          </div>
        ))}

        <div className="pricing-divider" />

        <div className="pricing-row pricing-total">
          <span className="pricing-label">
            <span className="pricing-bullet pricing-bullet-final" />
            Final Price
          </span>
          <div className="pricing-final-group">
            {totalIncrease > 0 && (
              <span className="pricing-increase-badge">+{increasePct}%</span>
            )}
            <span className="pricing-value pricing-final">${Number(finalPrice).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {frozen && (
        <div className="freeze-section">
          <div className="freeze-info">
            <span className="freeze-lock-icon">\uD83D\uDD12</span>
            <div className="freeze-details">
              <span className="freeze-text">Price locked at ${Number(frozen.frozenPrice).toFixed(2)}</span>
              <span className="freeze-expiry">
                Expires in <CountdownTimer expiresAt={frozen.expiresAt} />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

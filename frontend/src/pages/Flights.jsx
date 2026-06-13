import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFlights, calculateDynamicPrice, freezePrice, getFrozenPrice, deleteFrozenPrice } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import ReviewSection from '../components/ReviewSection.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import PriceHistoryGraph from '../components/PriceHistoryGraph.jsx';

function SkeletonCard() {
  return (
    <div className="card flex-col gap-3">
      <div className="skeleton" style={{ height: '20px', width: '55%' }} />
      <div className="skeleton" style={{ height: '14px', width: '75%' }} />
      <div className="skeleton" style={{ height: '14px', width: '50%' }} />
      <div className="flex gap-2 mt-2">
        <div className="skeleton" style={{ height: '34px', flex: 1, borderRadius: 'var(--r-pill)' }} />
        <div className="skeleton" style={{ height: '34px', flex: 1, borderRadius: 'var(--r-pill)' }} />
      </div>
    </div>
  );
}

const AIRLINE_COLORS = [
  ['#1a237e', '#283593'], ['#004d40', '#00695c'],
  ['#4a148c', '#6a1b9a'], ['#bf360c', '#d84315'],
  ['#01579b', '#0277bd'],
];

export default function Flights() {
  const [flights, setFlights]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeReviewsId, setActiveReviewsId]   = useState(null);
  const [activePricingId, setActivePricingId]   = useState(null);
  const [pricingData, setPricingData]   = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const reviewPanelRef = useRef(null);

  function handleToggleReviews(flightId) {
    setActiveReviewsId(p => {
      const next = p === flightId ? null : flightId;
      if (next) {
        setTimeout(() => {
          reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return next;
    });
  }

  useEffect(() => {
    getFlights()
      .then(r => setFlights(r.flights || []))
      .catch(() => setError('Unable to load flights. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleTogglePricing(flight) {
    if (activePricingId === flight.id) { setActivePricingId(null); return; }
    setActivePricingId(flight.id);
    if (pricingData[flight.id]) return;
    try {
      const [pricing, frozenRes] = await Promise.all([
        calculateDynamicPrice('flight', flight.id),
        user ? getFrozenPrice('flight', flight.id).catch(() => ({ freeze: null })) : Promise.resolve({ freeze: null }),
      ]);
      setPricingData(p => ({ ...p, [flight.id]: { pricing, frozen: frozenRes.freeze, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [flight.id]: { pricing: null, frozen: null, freezeLoading: false } }));
    }
  }

  async function handleFreeze(flightId) {
    setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], freezeLoading: true } }));
    try {
      const res = await freezePrice('flight', flightId);
      setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], frozen: res.freeze, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], freezeLoading: false } }));
    }
  }

  async function handleUnfreeze(flightId) {
    setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], freezeLoading: true } }));
    try {
      await deleteFrozenPrice('flight', flightId);
      setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], frozen: null, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [flightId]: { ...p[flightId], freezeLoading: false } }));
    }
  }

  function handleBook(flight) {
    const pd = pricingData[flight.id];
    const frozen  = pd?.frozen ? pd.frozen.frozenPrice : null;
    const dynamic = pd?.pricing ? pd.pricing.finalPrice : flight.price;
    navigate('/booking', {
      state: { flightId: flight.id, airline: flight.airline, origin: flight.origin,
               destination: flight.destination, departureTime: flight.departureTime,
               price: frozen ?? dynamic, frozenPrice: frozen, pricingBreakdown: pd?.pricing || null,
               frozenExpiresAt: pd?.frozen?.expiresAt || null },
    });
  }

  const activeFlight = activeReviewsId ? flights.find(f => f.id === activeReviewsId) : null;

  return (
    <div className="page-card">
      <h2 className="section-title">✈️ Flights</h2>
      <p className="section-subtitle">Search, compare and book flights instantly.</p>

      {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

      <div className="grid-list card-grid">
        {loading ? (
          [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
        ) : flights.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <p className="empty-state-title">No flights available</p>
            <p className="empty-state-desc">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          flights.map((flight, idx) => {
            const pd = pricingData[flight.id];
            const isFrozen = !!pd?.frozen;
            const [from, to] = AIRLINE_COLORS[idx % AIRLINE_COLORS.length];
            const statusCls = flight.currentStatus === 'Delayed by 1h'
              ? 'status-badge status-badge-delayed'
              : flight.currentStatus === 'Boarding'
                ? 'status-badge status-badge-boarding'
                : 'status-badge status-badge-on-time';

            return (
              <div key={flight.id} className="card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div className="flight-header-strip" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                  <div className="flight-header-info">
                    <p className="flight-airline-name">{flight.airline}</p>
                    <p className="flight-route-short">{flight.origin} ✈ {flight.destination}</p>
                  </div>
                  <div className="flight-header-badges">
                    {flight.currentStatus && (
                      <span className={statusCls} style={{ fontSize: '0.72rem' }}>{flight.currentStatus}</span>
                    )}
                    {isFrozen && (
                      <span className="badge badge-frozen" style={{ display: 'block', marginTop: '4px', fontSize: '0.7rem' }}>🔒 Frozen</span>
                    )}
                  </div>
                </div>

                <div className="listing-card-body-content">
                  <div className="flight-route-visual">
                    <div className="flight-route-point-sm">
                      <p className="flight-route-code-sm">{flight.origin}</p>
                      <p className="flight-route-label-sm">Origin</p>
                    </div>
                    <div className="flight-route-arrow-lg">→</div>
                    <div className="flight-route-point-sm">
                      <p className="flight-route-code-sm">{flight.destination}</p>
                      <p className="flight-route-label-sm">Destination</p>
                    </div>
                  </div>

                  <div className="flight-detail-grid">
                    <div>
                      <p className="status-label">Departure</p>
                      <p className="status-value">{new Date(flight.departureTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="status-label">Arrival</p>
                      <p className="status-value">{new Date(flight.arrivalTime).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flight-price-row">
                    <div>
                      {isFrozen
                        ? <>
                            <span className="price-strikeout">${Number(flight.price).toFixed(0)}</span>{' '}
                            <span className="price-tag">${Number(pd.frozen.frozenPrice).toFixed(0)}</span>
                          </>
                        : <span className="price-tag">${Number(flight.price).toFixed(0)}</span>
                      }
                    </div>
                    <span className="tag tag-blue">💺 {flight.seatsAvailable} seats</span>
                  </div>

                  <div className="listing-card-actions">
                    <button className="button button-primary button-sm" onClick={() => handleBook(flight)}>Book Now</button>
                    <button className="button button-secondary button-sm" onClick={() => handleTogglePricing(flight)}>
                      {activePricingId === flight.id ? 'Hide Pricing' : '📊 Pricing'}
                    </button>
                    <button className="button button-ghost button-sm" onClick={() => handleToggleReviews(flight.id)}>
                      {activeReviewsId === flight.id ? 'Hide Reviews' : '⭐ Reviews'}
                    </button>
                  </div>
                </div>

                <div className={`pricing-panel ${activePricingId === flight.id ? 'pricing-panel-open' : ''}`}>
                  <div className="pricing-panel-inner">
                    {activePricingId === flight.id && pd?.pricing ? (
                      <>
                        <PriceBreakdown pricing={pd.pricing} frozen={pd.frozen} />
                        {user && !isFrozen && (
                          <button className="button button-primary button-sm pricing-freeze-btn" onClick={() => handleFreeze(flight.id)} disabled={pd.freezeLoading}>
                            {pd.freezeLoading ? '⏳ Freezing…' : '🔒 Freeze Price (30 min)'}
                          </button>
                        )}
                        {user && isFrozen && (
                          <button className="button button-secondary button-sm pricing-freeze-btn" onClick={() => handleUnfreeze(flight.id)} disabled={pd.freezeLoading}>
                            {pd.freezeLoading ? '⏳' : '🔓 Unfreeze Price'}
                          </button>
                        )}
                        <PriceHistoryGraph entityType="flight" entityId={flight.id} />
                      </>
                    ) : activePricingId === flight.id ? (
                      <div className="pricing-skeleton">
                        <div className="skeleton" style={{ height: '12px' }} />
                        <div className="skeleton" style={{ height: '12px', width: '60%' }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activeReviewsId && activeFlight && (
        <div className="review-full-width-panel" ref={reviewPanelRef}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              ⭐ Reviews for {activeFlight.airline}: {activeFlight.origin} → {activeFlight.destination}
            </h3>
            <button className="button button-ghost button-sm" onClick={() => setActiveReviewsId(null)}>
              ✕ Close
            </button>
          </div>
          <ReviewSection flightId={activeReviewsId} />
        </div>
      )}
    </div>
  );
}

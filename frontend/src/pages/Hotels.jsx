import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHotels, calculateDynamicPrice, freezePrice, getFrozenPrice, deleteFrozenPrice } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import ReviewSection from '../components/ReviewSection.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import PriceHistoryGraph from '../components/PriceHistoryGraph.jsx';

const HOTEL_EMOJIS = ['🏖️', '🏔️', '🏙️', '🌴', '🏜️'];

function StarRating({ rating }) {
  return (
    <span className="star-row">
      {'★★★★★'.split('').map((s, i) => (
        <span key={i} className={i < Math.round(rating) ? 'star-filled' : 'star-empty'}>{s}</span>
      ))}
      <span className="rating-value">{rating}</span>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card flex-col gap-3" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: '160px', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} />
      <div className="p-4 flex-col gap-2">
        <div className="skeleton" style={{ height: '20px', width: '60%' }} />
        <div className="skeleton" style={{ height: '14px', width: '40%' }} />
        <div className="skeleton" style={{ height: '14px', width: '80%' }} />
        <div className="skeleton" style={{ height: '36px', borderRadius: 'var(--r-pill)', marginTop: 'var(--sp-2)' }} />
      </div>
    </div>
  );
}

export default function Hotels() {
  const [hotels, setHotels]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeReviewsId, setActiveReviewsId]   = useState(null);
  const [activePricingId, setActivePricingId]   = useState(null);
  const [pricingData, setPricingData]   = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const reviewPanelRef = useRef(null);

  function handleToggleReviews(hotelId) {
    setActiveReviewsId(p => {
      const next = p === hotelId ? null : hotelId;
      if (next) {
        setTimeout(() => {
          reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return next;
    });
  }

  useEffect(() => {
    getHotels()
      .then(r => setHotels(r.hotels || []))
      .catch(() => setError('Unable to load hotels. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleTogglePricing(hotel) {
    if (activePricingId === hotel.id) { setActivePricingId(null); return; }
    setActivePricingId(hotel.id);
    if (pricingData[hotel.id]) return;
    try {
      const [pricing, frozenRes] = await Promise.all([
        calculateDynamicPrice('hotel', hotel.id),
        user ? getFrozenPrice('hotel', hotel.id).catch(() => ({ freeze: null })) : Promise.resolve({ freeze: null }),
      ]);
      setPricingData(p => ({ ...p, [hotel.id]: { pricing, frozen: frozenRes.freeze, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [hotel.id]: { pricing: null, frozen: null, freezeLoading: false } }));
    }
  }

  async function handleFreeze(hotelId) {
    setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], freezeLoading: true } }));
    try {
      const res = await freezePrice('hotel', hotelId);
      setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], frozen: res.freeze, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], freezeLoading: false } }));
    }
  }

  async function handleUnfreeze(hotelId) {
    setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], freezeLoading: true } }));
    try {
      await deleteFrozenPrice('hotel', hotelId);
      setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], frozen: null, freezeLoading: false } }));
    } catch {
      setPricingData(p => ({ ...p, [hotelId]: { ...p[hotelId], freezeLoading: false } }));
    }
  }

  function handleBook(hotel) {
    const pd = pricingData[hotel.id];
    const frozen  = pd?.frozen ? pd.frozen.frozenPrice : null;
    const dynamic = pd?.pricing ? pd.pricing.finalPrice : hotel.pricePerNight;
    navigate('/booking', {
      state: { hotelId: hotel.id, hotelName: hotel.name, hotelLocation: hotel.location,
               pricePerNight: frozen ?? dynamic, frozenPrice: frozen, pricingBreakdown: pd?.pricing || null },
    });
  }

  const activeHotel = activeReviewsId ? hotels.find(h => h.id === activeReviewsId) : null;

  return (
    <div className="page-card">
      <h2 className="section-title">🏨 Hotels</h2>
      <p className="section-subtitle">Find the perfect stay for every trip.</p>

      {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

      <div className="grid-list card-grid">
        {loading ? (
          [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
        ) : hotels.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏨</div>
            <p className="empty-state-title">No hotels available</p>
            <p className="empty-state-desc">Check back soon — new properties are added regularly.</p>
          </div>
        ) : (
          hotels.map((hotel, idx) => {
            const pd = pricingData[hotel.id];
            const isFrozen = !!pd?.frozen;
            return (
              <div key={hotel.id} className="card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div
                  className="listing-card-image-area"
                  style={{ background: `linear-gradient(135deg, hsl(${idx * 60},55%,45%), hsl(${idx * 60 + 40},60%,55%))` }}
                >
                  {HOTEL_EMOJIS[idx % HOTEL_EMOJIS.length]}
                  {isFrozen && (
                    <span className="badge badge-frozen listing-card-badge-overlay">🔒 Frozen</span>
                  )}
                </div>

                <div className="listing-card-body-content">
                  <h3 style={{ margin: 0 }}>{hotel.name}</h3>
                  <p className="text-muted" style={{ margin: 0 }}>📍 {hotel.location}</p>
                  <StarRating rating={hotel.rating} />
                  <p className="text-muted font-small" style={{ margin: 0 }}>{hotel.description}</p>

                  <div className="listing-card-price-row">
                    <div>
                      {isFrozen
                        ? <>
                            <span className="price-strikeout">${Number(hotel.pricePerNight).toFixed(0)}</span>{' '}
                            <span className="price-tag">${Number(pd.frozen.frozenPrice).toFixed(0)}</span>
                            <span className="price-per"> /night</span>
                          </>
                        : <><span className="price-tag">${Number(hotel.pricePerNight).toFixed(0)}</span><span className="price-per"> /night</span></>
                      }
                    </div>
                    <span className="tag tag-green">🛏️ {hotel.availableRooms} rooms</span>
                  </div>

                  <div className="listing-card-actions">
                    <button className="button button-primary button-sm" onClick={() => handleBook(hotel)}>Book Now</button>
                    <button className="button button-secondary button-sm" onClick={() => handleTogglePricing(hotel)}>
                      {activePricingId === hotel.id ? 'Hide Pricing' : '📊 Pricing'}
                    </button>
                    <button className="button button-ghost button-sm" onClick={() => handleToggleReviews(hotel.id)}>
                      {activeReviewsId === hotel.id ? 'Hide Reviews' : '⭐ Reviews'}
                    </button>
                  </div>
                </div>

                <div className={`pricing-panel ${activePricingId === hotel.id ? 'pricing-panel-open' : ''}`}>
                  <div className="pricing-panel-inner">
                    {activePricingId === hotel.id && pd?.pricing ? (
                      <>
                        <PriceBreakdown pricing={pd.pricing} frozen={pd.frozen} />
                        {user && !isFrozen && (
                          <button className="button button-primary button-sm pricing-freeze-btn" onClick={() => handleFreeze(hotel.id)} disabled={pd.freezeLoading}>
                            {pd.freezeLoading ? '⏳ Freezing…' : '🔒 Freeze Price (30 min)'}
                          </button>
                        )}
                        {user && isFrozen && (
                          <button className="button button-secondary button-sm pricing-freeze-btn" onClick={() => handleUnfreeze(hotel.id)} disabled={pd.freezeLoading}>
                            {pd.freezeLoading ? '⏳' : '🔓 Unfreeze Price'}
                          </button>
                        )}
                        <PriceHistoryGraph entityType="hotel" entityId={hotel.id} />
                      </>
                    ) : activePricingId === hotel.id ? (
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

      {activeReviewsId && activeHotel && (
        <div className="review-full-width-panel" ref={reviewPanelRef}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>⭐ Reviews for {activeHotel.name}</h3>
            <button className="button button-ghost button-sm" onClick={() => setActiveReviewsId(null)}>
              ✕ Close
            </button>
          </div>
          <ReviewSection hotelId={activeReviewsId} />
        </div>
      )}
    </div>
  );
}

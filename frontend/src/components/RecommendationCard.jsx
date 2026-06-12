import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitRecommendationFeedback } from '../services/api.js';

const GRADIENTS = [
  ['#0ea5e9', '#06b6d4'],
  ['#8b5cf6', '#6d28d9'],
  ['#f59e0b', '#ea580c'],
  ['#10b981', '#059669'],
  ['#ec4899', '#db2777'],
];

const TYPE_ICONS = { hotel: '🏨', flight: '✈️', destination: '🌍' };

export default function RecommendationCard({ rec, onFeedback, gradientIndex = 0 }) {
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const { type, entity, reason, score } = rec;
  const matchPercentage = score ? Math.min(99, 70 + Math.floor(score * 2)) : 85;
  const [from, to] = GRADIENTS[gradientIndex % GRADIENTS.length];

  function getTitle() {
    if (type === 'hotel')       return entity.name;
    if (type === 'flight')      return `${entity.airline}: ${entity.origin} → ${entity.destination}`;
    if (type === 'destination') return entity.name;
    return '';
  }

  function getSubtitle() {
    if (type === 'hotel')       return `📍 ${entity.location} · ⭐ ${entity.rating} · $${Number(entity.pricePerNight).toFixed(0)}/night`;
    if (type === 'flight')      return `💺 ${entity.seatsAvailable} seats · $${Number(entity.price).toFixed(0)}`;
    if (type === 'destination') return '✨ Suggested destination based on your trips';
    return '';
  }

  function getPrice() {
    if (type === 'hotel')       return `From $${Number(entity.pricePerNight).toFixed(0)}/night`;
    if (type === 'flight')      return `$${Number(entity.price).toFixed(0)}`;
    if (type === 'destination') return '';
    return '';
  }

  function handleBook() {
    if (type === 'hotel') {
      navigate('/booking', {
        state: { hotelId: entity.id, hotelName: entity.name, hotelLocation: entity.location, pricePerNight: entity.pricePerNight },
      });
    } else if (type === 'flight') {
      navigate('/booking', {
        state: { flightId: entity.id, airline: entity.airline, origin: entity.origin, destination: entity.destination, price: entity.price },
      });
    } else {
      navigate('/hotels');
    }
  }

  async function handleFeedback(feedback) {
    if (feedbackGiven || submitting) return;
    setSubmitting(true);
    try {
      const payload = { recommendationType: type, feedback };
      if (type === 'destination') payload.destination = entity.name;
      else payload.entityId = entity.id;
      await submitRecommendationFeedback(payload);
      setFeedbackGiven(feedback);
      onFeedback?.(rec, feedback);
    } catch {
      // non-critical
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rec-card">
      {/* ── Image Banner ── */}
      <div
        className="rec-card-image"
        style={
          entity.image
            ? { backgroundImage: `url('${entity.image}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
            : { background: `linear-gradient(135deg, ${from}, ${to})` }
        }
      >
        {!entity.image && <span className="rec-card-image-emoji">{TYPE_ICONS[type] || '✨'}</span>}
        <span className="rec-card-badge">{matchPercentage}% Match</span>
      </div>

      {/* ── Content ── */}
      <div className="rec-card-content">
        <div className="rec-card-title">{getTitle()}</div>
        <div className="rec-card-subtitle">{getSubtitle()}</div>

        {getPrice() && (
          <div className="rec-card-price">{getPrice()}</div>
        )}

        {/* ── Reason + Why tooltip ── */}
        <div className="rec-reason-row">
          <span className="rec-reason-text">{reason}</span>
          <div className="rec-why-wrap" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <button type="button" className="rec-why-btn" aria-label="Why this recommendation?">Why?</button>
            {showTooltip && (
              <div className="rec-tooltip">
                <div className="rec-tooltip-arrow" />
                {reason}
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="rec-card-actions">
          <button type="button" className="button button-primary button-sm" onClick={handleBook}>
            {type === 'hotel' ? 'Book Hotel' : type === 'flight' ? 'Book Flight' : 'Explore Hotels →'}
          </button>
          <div className="rec-feedback-wrap">
            {feedbackGiven ? (
              <span className="rec-feedback-given">
                {feedbackGiven === 'helpful' ? '👍 Marked helpful' : '👎 Marked irrelevant'}
              </span>
            ) : (
              <>
                <button type="button" className="rec-feedback-btn rec-feedback-helpful" disabled={submitting} onClick={() => handleFeedback('helpful')} title="This is helpful">
                  👍 Helpful
                </button>
                <button type="button" className="rec-feedback-btn rec-feedback-irrelevant" disabled={submitting} onClick={() => handleFeedback('irrelevant')} title="Not relevant to me">
                  👎 Not Interested
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

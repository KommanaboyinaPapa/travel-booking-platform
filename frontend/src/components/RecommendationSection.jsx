import { useEffect, useState } from 'react';
import { getRecommendations } from '../services/api.js';
import RecommendationCard from './RecommendationCard.jsx';

const MOCK_RECS = [
  {
    type: 'destination',
    entity: {
      name: 'Bali, Indonesia',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=250&fit=crop',
    },
    reason: 'You visited 2 beach destinations last year',
    score: 95,
  },
  {
    type: 'hotel',
    entity: {
      id: 101,
      name: 'Grand Ocean Resort',
      location: 'Maldives',
      rating: 4.9,
      pricePerNight: 450,
      image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&h=250&fit=crop',
    },
    reason: 'Popular among travelers from your city',
    score: 92,
  },
  {
    type: 'flight',
    entity: {
      id: 201,
      airline: 'SkyWings Airlines',
      origin: 'JFK',
      destination: 'LAX',
      price: 349,
      seatsAvailable: 18,
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=250&fit=crop',
    },
    reason: 'Prices dropped 15% this week',
    score: 88,
  },
];

export default function RecommendationSection({ compact = false }) {
  const [recommendations, setRecommendations] = useState([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    getRecommendations()
      .then(data => {
        const recs = data.recommendations || [];
        setRecommendations(recs.length > 0 ? recs : MOCK_RECS);
        setHasHistory(data.hasHistory ?? false);
      })
      .catch(() => {
        setRecommendations(MOCK_RECS);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleFeedback(rec, feedback) {
    if (feedback === 'irrelevant') {
      const key = rec.type === 'destination'
        ? `destination:${rec.entity.name}`
        : `${rec.type}:${rec.entity.id}`;
      setDismissed(prev => new Set([...prev, key]));
    }
  }

  const visible = recommendations.filter(r => {
    const key = r.type === 'destination'
      ? `destination:${r.entity.name}`
      : `${r.type}:${r.entity.id}`;
    return !dismissed.has(key);
  });

  // Ensure at least 3 display cards (or fall back to mock if dismissed)
  let displayRecs = compact ? visible.slice(0, 3) : visible.slice(0, 4);
  if (displayRecs.length < 3) {
    const fallback = MOCK_RECS.filter(r => !visible.some(v =>
      v.type === r.type && (v.type === 'destination' ? v.entity.name === r.entity.name : v.entity.id === r.entity.id)
    ));
    displayRecs = [...visible, ...fallback].slice(0, compact ? 3 : 4);
  }

  return (
    <div className="card dashboard-widget">
      <div className="rec-section-header">
        <h3 className="rec-section-title">
          ✨ {hasHistory ? 'Recommended For You' : 'Popular Picks'}
        </h3>
      </div>

      <div className="rec-grid">
        {displayRecs.slice(0, 3).map((rec, i) => (
          <RecommendationCard
            key={`${rec.type}-${rec.entity.id ?? rec.entity.name}-${i}`}
            rec={rec}
            gradientIndex={i}
            onFeedback={handleFeedback}
          />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createReply, createReview, flagReview, getReviews, markReviewHelpful } from '../services/api.js';
import ReviewForm from './ReviewForm.jsx';
import ReviewList from './ReviewList.jsx';
import StarRating from './StarRating.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ReviewSection({ hotelId, flightId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const entityId = hotelId || flightId;
  const entityType = hotelId ? 'hotel' : 'flight';

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      const response = await getReviews({ hotelId, flightId, sortBy });
      setReviews(response.reviews || []);
    } catch (err) {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [hotelId, flightId, sortBy]);

  async function handleSubmitReview(payload) {
    if (!payload.reviewText.trim()) {
      setFormError('Please enter some review text.');
      return false;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      await createReview({
        rating: payload.rating,
        reviewText: payload.reviewText,
        photoUrl: payload.photoUrl,
        hotelId,
        flightId,
      });
      setFormSuccess('Review posted successfully!');
      await loadReviews();
      setTimeout(() => setFormSuccess(''), 3000);
      return true;
    } catch (err) {
      setFormError(err.message || 'Failed to submit review.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHelpful(reviewId) {
    try {
      await markReviewHelpful(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r));
    } catch (err) {
      console.error('Failed to mark review helpful', err);
    }
  }

  async function handleReply(reviewId, replyText) {
    await createReply(reviewId, replyText);
    await loadReviews();
  }

  async function handleFlag(reviewId, reason) {
    await flagReview(reviewId, reason);
  }

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : 0;

  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++; });

  return (
    <div className="review-section-wrap">
      <div className="review-section-inner">
        {/* ── Left column: header + summary + list ── */}
        <div className="review-section-col-main">
          {/* ── Header row ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>⭐ Reviews & Ratings</h4>
              {totalReviews > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#7a8fb0' }}>
                  Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor={`sort-${entityId}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#455a7a' }}>Sort:</label>
              <select
                id={`sort-${entityId}`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select-modern"
              >
                <option value="newest">Newest</option>
                <option value="highest">Highest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
            </div>
          </div>

          {/* ── Summary Card ── */}
          {totalReviews > 0 && (
            <div className="review-summary-card">
              <div className="review-summary-left">
                <div className="review-summary-avg-number">{avgRating}</div>
                <div className="review-summary-avg-stars">
                  <StarRating rating={Math.round(avgRating)} size={18} />
                </div>
                <div className="review-summary-total">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</div>
              </div>
              <div className="review-dist">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = distribution[star - 1];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="review-dist-row">
                      <span className="review-dist-label">{star}</span>
                      <div className="review-dist-bar-bg">
                        <div className="review-dist-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="review-dist-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Review List ── */}
          <ReviewList
            reviews={reviews}
            loading={loading}
            error={error}
            user={user}
            onHelpful={handleHelpful}
            onReply={handleReply}
            onFlag={handleFlag}
          />
        </div>

        {/* ── Right column: review form ── */}
        <div className="review-section-col-side">
          {user ? (
            <ReviewForm
              entityKey={`${entityType}-${entityId}`}
              onSubmitReview={handleSubmitReview}
              submitting={submitting}
              error={formError}
              success={formSuccess}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#7a8fb0' }}>
                Please <a href="/login" style={{ color: '#0071c2', fontWeight: 700, textDecoration: 'underline' }}>log in</a> to submit a rating and review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

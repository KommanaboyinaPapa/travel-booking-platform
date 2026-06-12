import { useEffect, useState } from 'react';
import { deleteReviewAsAdmin, getFlaggedReviews, updateFlagStatus } from '../services/api.js';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function Moderator() {
  const { user } = useAuth();
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadFlaggedReviews() {
    setLoading(true);
    setError('');
    try {
      const response = await getFlaggedReviews();
      setFlaggedReviews(response.flaggedReviews || []);
    } catch (err) {
      setError('Unable to load flagged reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadFlaggedReviews();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function handleDeleteReview(reviewId) {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;

    try {
      await deleteReviewAsAdmin(reviewId);
      setMessage('Review deleted successfully.');
      setFlaggedReviews(prev => prev.filter(item => item.reviewId !== reviewId));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete review.');
      setTimeout(() => setError(''), 3000);
    }
  }

  async function handleDismissReport(flagId) {
    try {
      await updateFlagStatus(flagId, 'Reviewed');
      setFlaggedReviews(prev => prev.filter(item => item.flagId !== flagId));
      setMessage('Report reviewed. The review was kept.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update the report status.');
      setTimeout(() => setError(''), 3000);
    }
  }

  if (!user) {
    return (
      <div className="page-card">
        <h2 className="section-title">Admin Reviews</h2>
        <p className="text-muted">Please sign in to review flagged content.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="page-card">
        <h2 className="section-title">Admin Reviews</h2>
        <p className="text-muted">Only administrators can access flagged review moderation.</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">Admin Reviews</h2>
      <p className="text-muted">Review flagged customer feedback and remove inappropriate reviews.</p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginTop: '20px' }}>
        {loading ? (
          <div>Loading flagged reviews...</div>
        ) : flaggedReviews.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0, fontStyle: 'italic', textAlign: 'center', color: '#64748b' }}>
              No flagged reviews found. The platform is clean!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {flaggedReviews.map((item) => (
              <div
                key={item.flagId}
                className="card"
                style={{
                  borderLeft: '4px solid #ef4444',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      REPORTED: {item.flagReason}
                    </span>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Reported by {item.flaggerName} on {new Date(item.flaggedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="button button-outline"
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#10b981', borderColor: '#10b981' }}
                      onClick={() => handleDismissReport(item.flagId)}
                    >
                      Keep Review
                    </button>
                    <button
                      type="button"
                      className="button"
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', color: '#ffffff' }}
                      onClick={() => handleDeleteReview(item.reviewId)}
                    >
                      Delete Review
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px' }}>Author: {item.reviewerName}</strong>
                    <StarRating rating={item.rating} size={14} />
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                    {item.reviewText}
                  </p>
                  
                  {item.photoUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <img
                        src={item.photoUrl}
                        alt="Flagged Review content preview"
                        style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

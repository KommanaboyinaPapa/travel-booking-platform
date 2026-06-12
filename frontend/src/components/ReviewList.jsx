import { useState } from 'react';
import StarRating from './StarRating.jsx';

const FLAG_REASONS = [
  'Inappropriate language',
  'Spam or advertising',
  'Irrelevant review content',
  'Hate speech or harassment',
  'Other',
];

const AVATAR_COLORS = [
  'linear-gradient(135deg, #003580, #0071c2)',
  'linear-gradient(135deg, #1a237e, #3949ab)',
  'linear-gradient(135deg, #004d40, #00897b)',
  'linear-gradient(135deg, #4a148c, #7b1fa2)',
  'linear-gradient(135deg, #bf360c, #e64a19)',
  'linear-gradient(135deg, #01579b, #0288d1)',
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ReviewList({
  reviews,
  loading,
  error,
  user,
  onHelpful,
  onReply,
  onFlag,
}) {
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [flaggingReview, setFlaggingReview] = useState(null);
  const [flagReason, setFlagReason] = useState(FLAG_REASONS[0]);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  async function handleReplySubmit(event, reviewId) {
    event.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    setActionError('');
    try {
      await onReply(reviewId, replyText.trim());
      setReplyText('');
      setReplyingReviewId(null);
      setActionMessage('Reply posted successfully.');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (err) {
      setActionError(err.message || 'Unable to post the reply.');
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleFlagSubmit() {
    if (!flaggingReview) return;

    setActionError('');
    try {
      await onFlag(flaggingReview.id, flagReason);
      setFlaggingReview(null);
      setFlagReason(FLAG_REASONS[0]);
      setActionMessage('Review has been reported to moderators.');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (err) {
      setActionError(err.message || 'Unable to report this review.');
    }
  }

  return (
    <>
      {actionMessage && <div className="alert alert-success" style={{ marginTop: '12px', fontSize: '13px', padding: '10px 14px' }}>{actionMessage}</div>}
      {actionError && <div className="alert alert-error" style={{ marginTop: '12px', fontSize: '13px', padding: '10px 14px' }}>{actionError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: '#64748b' }}>Loading reviews...</p>
        ) : error ? (
          <div className="alert alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>{error}</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No reviews yet</p>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>Be the first to share your experience.</p>
          </div>
        ) : (
          reviews.map((review) => {
            const initials = getInitials(review.userName);
            const avatarBg = getAvatarColor(review.userName);

            return (
              <div key={review.id} className="review-card-modern">
                <div className="review-card-header">
                  <div className="review-avatar" style={{ background: avatarBg }}>{initials}</div>
                  <div className="review-card-meta">
                    <p className="review-card-name">{review.userName}</p>
                    <div className="review-card-stars-row">
                      <StarRating rating={review.rating} size={14} />
                      <span className="review-card-time">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="review-card-text">{review.reviewText}</p>

                {review.photoUrl && (
                  <div className="review-thumbnails">
                    <img
                      src={review.photoUrl}
                      alt="Review upload"
                      className="review-thumbnail"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="review-actions">
                  <button
                    type="button"
                    onClick={() => onHelpful(review.id)}
                    className="review-action-btn review-action-btn-helpful"
                  >
                    👍 Helpful ({review.helpfulCount || 0})
                  </button>

                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(replyingReviewId === review.id ? null : review.id);
                        setReplyText('');
                      }}
                      className="review-action-btn review-action-btn-reply"
                    >
                      💬 {replyingReviewId === review.id ? 'Cancel Reply' : 'Reply'}
                    </button>
                  )}

                  {user && (
                    <button
                      type="button"
                      onClick={() => setFlaggingReview(review)}
                      className="review-action-btn review-action-btn-report"
                    >
                      🚩 Report
                    </button>
                  )}
                </div>

                {review.replies?.length > 0 && (
                  <div className="review-reply-box">
                    {review.replies.map((reply) => (
                      <div key={reply.id} className="review-reply-item">
                        <div className="review-reply-header">
                          <span className="review-reply-name">{reply.userName}</span>
                          <span className="review-reply-time">
                            {new Date(reply.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="review-reply-text">{reply.replyText}</p>
                      </div>
                    ))}
                  </div>
                )}

                {replyingReviewId === review.id && (
                  <form onSubmit={(event) => handleReplySubmit(event, review.id)} className="review-reply-form">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      className="review-reply-input"
                      required
                    />
                    <button
                      type="submit"
                      className="button button-primary"
                      style={{ padding: '10px 16px', fontSize: '0.82rem' }}
                      disabled={submittingReply}
                    >
                      {submittingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>

      {flaggingReview && (
        <div className="modal-overlay" onClick={() => setFlaggingReview(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#dc2626' }}>Report Review</h3>
            <p style={{ fontSize: '14px' }}>
              Report review from <strong>{flaggingReview.userName}</strong> for moderator review.
            </p>

            <div className="form-field" style={{ marginTop: '16px' }}>
              <label htmlFor="flag-reason">Reason for report</label>
              <select
                id="flag-reason"
                value={flagReason}
                onChange={(event) => setFlagReason(event.target.value)}
              >
                {FLAG_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                onClick={handleFlagSubmit}
              >
                Report Review
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setFlaggingReview(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

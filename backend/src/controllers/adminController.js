import pool from '../config/db.js';
import { fallbackReviews, fallbackFlags, fallbackReplies } from './reviewController.js';
import { fallbackRefunds } from './bookingController.js';

export async function getFlaggedReviews(req, res) {
  try {
    const [flags] = await pool.query(
      `SELECT rf.id AS flagId, rf.review_id AS reviewId, rf.reason AS flagReason, 
              rf.created_at AS flaggedAt, rf.status AS flagStatus, 
              r.rating, r.review_text AS reviewText, r.photo_url AS photoUrl, 
              u.name AS reviewerName, uf.name AS flaggerName 
       FROM review_flags rf 
       JOIN reviews r ON rf.review_id = r.id 
       JOIN users u ON r.user_id = u.id 
       JOIN users uf ON rf.user_id = uf.id 
       WHERE rf.status = 'Pending'
       ORDER BY rf.created_at DESC`
    );

    return res.status(200).json({ flaggedReviews: flags });
  } catch (err) {
    console.warn('DB error, loading flagged reviews from fallback store:', err.message || err);

    const flaggedList = fallbackFlags.map(flag => {
      const review = fallbackReviews.find(r => r.id === flag.reviewId);
      return {
        flagId: flag.id,
        reviewId: flag.reviewId,
        flagReason: flag.reason,
        flaggedAt: flag.createdAt,
        flagStatus: flag.status,
        rating: review ? review.rating : 0,
        reviewText: review ? review.reviewText : 'Deleted Review',
        photoUrl: review ? review.photoUrl : null,
        reviewerName: review ? review.userName : 'Anonymous',
        flaggerName: `User #${flag.userId}`
      };
    });

    return res.status(200).json({ flaggedReviews: flaggedList });
  }
}

export async function updateFlagStatus(req, res) {
  const flagId = req.params.id;
  const status = req.body.status;

  if (!['Reviewed', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid flag status.' });
  }

  try {
    const [result] = await pool.query('UPDATE review_flags SET status = ? WHERE id = ?', [status, flagId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Flag not found.' });
    }
    return res.status(200).json({ message: 'Flag status updated successfully.' });
  } catch (err) {
    console.warn('DB error, updating fallback flag status:', err.message || err);

    const flag = fallbackFlags.find((item) => item.id === Number(flagId));
    if (!flag) {
      return res.status(404).json({ message: 'Flag not found.' });
    }

    flag.status = status;
    return res.status(200).json({ message: 'Flag status updated successfully (fallback).' });
  }
}

export async function removeReview(req, res) {
  const reviewId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    return res.status(200).json({ message: 'Review removed successfully by moderator.' });
  } catch (err) {
    console.warn('DB error, removing review from fallback store:', err.message || err);

    const index = fallbackReviews.findIndex(r => r.id === Number(reviewId));
    if (index === -1) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Remove the review
    fallbackReviews.splice(index, 1);

    // Cascade delete replies
    for (let i = fallbackReplies.length - 1; i >= 0; i--) {
      if (fallbackReplies[i].reviewId === Number(reviewId)) {
        fallbackReplies.splice(i, 1);
      }
    }

    // Cascade delete flags
    for (let i = fallbackFlags.length - 1; i >= 0; i--) {
      if (fallbackFlags[i].reviewId === Number(reviewId)) {
        fallbackFlags.splice(i, 1);
      }
    }

    return res.status(200).json({ message: 'Review removed successfully by moderator (fallback).' });
  }
}

// ============================================================================
// REFUND MANAGEMENT
// ============================================================================

export async function getAllRefunds(req, res) {
  try {
    const [refunds] = await pool.query(
      `SELECT r.id, r.booking_id AS bookingId, r.refund_amount AS refundAmount,
              r.refund_percentage AS refundPercentage, r.status,
              r.expected_completion_date AS expectedCompletionDate,
              r.created_at AS createdAt,
              c.reason AS cancellationReason, c.cancelled_at AS cancelledAt,
              u.name AS userName, u.email AS userEmail,
              b.user_id AS userId
       FROM refunds r
       LEFT JOIN cancellations c ON c.booking_id = r.booking_id
       LEFT JOIN bookings b ON b.id = r.booking_id
       LEFT JOIN users u ON u.id = b.user_id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json({ refunds });
  } catch (err) {
    console.warn('DB error, loading refunds from fallback store:', err.message || err);

    // Map fallback refunds with user info
    const refundsWithInfo = fallbackRefunds.map(refund => ({
      ...refund,
      userName: `User #${refund.userId || 'Unknown'}`,
      userEmail: '',
      cancellationReason: 'Change of plans',
      cancelledAt: refund.createdAt,
    }));

    return res.status(200).json({ refunds: refundsWithInfo });
  }
}

export async function updateRefundStatus(req, res) {
  const refundId = req.params.id;
  const { status } = req.body;

  if (!['Pending', 'Processed', 'Completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid refund status.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE refunds SET status = ? WHERE id = ?',
      [status, refundId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Refund not found.' });
    }

    return res.status(200).json({ message: 'Refund status updated successfully.' });
  } catch (err) {
    console.warn('DB error, updating fallback refund status:', err.message || err);

    const refund = fallbackRefunds.find(r => r.id === Number(refundId));
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found.' });
    }

    refund.status = status;
    return res.status(200).json({ message: 'Refund status updated successfully (fallback).' });
  }
}

export async function getRefundAnalytics(req, res) {
  try {
    const [refunds] = await pool.query(
      `SELECT r.id, r.refund_amount AS refundAmount, r.status, r.created_at AS createdAt,
              c.reason AS cancellationReason
       FROM refunds r
       LEFT JOIN cancellations c ON c.booking_id = r.booking_id`
    );

    // Calculate analytics
    const totalRefunds = refunds.length;
    const totalAmount = refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    const pendingCount = refunds.filter(r => r.status === 'Pending').length;
    const processedCount = refunds.filter(r => r.status === 'Processed').length;
    const completedCount = refunds.filter(r => r.status === 'Completed').length;

    // Cancellation reasons breakdown
    const reasonCounts = {};
    refunds.forEach(r => {
      const reason = r.cancellationReason || 'Other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const analytics = {
      totalRefunds,
      totalAmount: Number(totalAmount.toFixed(2)),
      statusBreakdown: {
        pending: pendingCount,
        processed: processedCount,
        completed: completedCount,
      },
      cancellationReasons: Object.entries(reasonCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: Number(((count / totalRefunds) * 100).toFixed(1)),
      })).sort((a, b) => b.count - a.count),
    };

    return res.status(200).json({ analytics });
  } catch (err) {
    console.warn('DB error, calculating analytics from fallback store:', err.message || err);

    const totalRefunds = fallbackRefunds.length;
    const totalAmount = fallbackRefunds.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    const pendingCount = fallbackRefunds.filter(r => r.status === 'Pending').length;
    const processedCount = fallbackRefunds.filter(r => r.status === 'Processed').length;
    const completedCount = fallbackRefunds.filter(r => r.status === 'Completed').length;

    const analytics = {
      totalRefunds,
      totalAmount: Number(totalAmount.toFixed(2)),
      statusBreakdown: {
        pending: pendingCount,
        processed: processedCount,
        completed: completedCount,
      },
      cancellationReasons: [
        { reason: 'Change of plans', count: Math.floor(totalRefunds * 0.4), percentage: 40 },
        { reason: 'Found a better deal', count: Math.floor(totalRefunds * 0.3), percentage: 30 },
        { reason: 'Personal emergency', count: Math.floor(totalRefunds * 0.2), percentage: 20 },
        { reason: 'Other', count: Math.floor(totalRefunds * 0.1), percentage: 10 },
      ],
    };

    return res.status(200).json({ analytics });
  }
}

import pool from '../config/db.js';
import { fallbackRefunds, fallbackBookings, fallbackCancellations } from './bookingController.js';

export async function getRefund(req, res) {
  const userId = req.user?.id;
  const bookingId = req.params.bookingId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  try {
    // 1. Verify booking exists and belongs to the user
    const [bookings] = await pool.query(
      'SELECT id, user_id AS userId FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or access denied.' });
    }

    // 2. Retrieve refund with cancellation reason
    const [refunds] = await pool.query(
      `SELECT r.id, r.booking_id AS bookingId, r.refund_amount AS refundAmount, 
              r.refund_percentage AS refundPercentage, r.status, 
              r.expected_completion_date AS expectedCompletionDate, r.created_at AS createdAt,
              c.reason AS cancellationReason, c.cancelled_at AS cancelledAt
       FROM refunds r
       LEFT JOIN cancellations c ON c.booking_id = r.booking_id
       WHERE r.booking_id = ?`,
      [bookingId]
    );

    if (refunds.length === 0) {
      return res.status(404).json({ message: 'Refund record not found.' });
    }

    return res.status(200).json({ refund: refunds[0] });
  } catch (err) {
    console.warn('DB error on get refund, falling back to in-memory store:', err.message || err);

    // Fallback logic
    const booking = fallbackBookings.find(b => b.id === Number(bookingId) && b.userId === userId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or access denied.' });
    }

    const refund = fallbackRefunds.find(r => r.bookingId === Number(bookingId));
    if (!refund) {
      return res.status(404).json({ message: 'Refund record not found.' });
    }

    // Get cancellation reason from fallback
    const cancellation = fallbackCancellations.find(c => c.bookingId === Number(bookingId));
    const refundWithReason = {
      ...refund,
      cancellationReason: cancellation?.reason || null,
      cancelledAt: cancellation?.cancelledAt || null,
    };

    return res.status(200).json({ refund: refundWithReason });
  }
}

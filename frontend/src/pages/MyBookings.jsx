import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBookings, cancelBooking } from '../services/api.js';
import RefundStatusTracker from '../components/RefundStatusTracker.jsx';

function SkeletonBooking() {
  return (
    <div className="booking-premium-card">
      <div className="booking-details-col">
        <div className="skeleton" style={{ height: '32px', width: '30%' }} />
        <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = { confirmed: 'badge badge-confirmed', pending: 'badge badge-pending', cancelled: 'badge badge-cancelled' };
  const icons = { confirmed: '✅', pending: '⏳', cancelled: '❌' };
  return (
    <span className={cls[status] || 'badge badge-pending'} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
      {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function MyBookings() {
  const [bookings, setBookings]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [message, setMessage]               = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason]     = useState('Change of plans');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      setTimeout(() => setMessage(''), 4000);
    }
  }, [location.state]);

  async function loadBookings() {
    try {
      const r = await getBookings();
      setBookings(r.bookings || []);
    } catch {
      setError('Unable to load bookings. Please refresh.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadBookings(); }, []);

  async function handleConfirmCancel() {
    if (!cancellingBooking) return;
    try {
      const res = await cancelBooking(cancellingBooking.id, cancelReason);
      await loadBookings();
      const ref = res.refund;
      setMessage(`Booking cancelled. Refund of $${Number(ref.refundAmount).toFixed(2)} (${ref.refundPercentage}%) has been initiated.`);
      setTimeout(() => setMessage(''), 8000);
    } catch (err) {
      setError(err.message || 'Failed to cancel booking.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setCancellingBooking(null);
    }
  }

  let estPct = 25, estRefund = 0;
  if (cancellingBooking) {
    const hrs = (Date.now() - new Date(cancellingBooking.createdAt)) / 3600000;
    estPct    = hrs <= 24 ? 50 : 25;
    estRefund = cancellingBooking.totalPrice * (estPct / 100);
  }

  return (
    <div className="page-content page-content-narrow">
      <h2 className="section-title">📋 My Bookings</h2>
      <p className="section-subtitle" style={{ marginBottom: '32px' }}>Manage your trips, flights, and accommodations.</p>

      {message && <div className="alert alert-success" style={{ marginBottom: '24px' }}><span>✅</span> {message}</div>}
      {error   && <div className="alert alert-error" style={{ marginBottom: '24px' }}><span>⚠️</span> {error}</div>}

      <div className="state-wrapper">
        {loading ? (
          [1, 2, 3].map(i => <SkeletonBooking key={i} />)
        ) : bookings.length === 0 ? (
          <div className="empty-bookings">
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1a2340', margin: 0 }}>No bookings yet</p>
            <p style={{ fontSize: '0.95rem', margin: '8px 0 24px' }}>
              Your confirmed trips and upcoming adventures will appear here.
            </p>
            <div className="empty-state-actions">
              <Link to="/hotels"  className="button button-primary">🏨 Browse Hotels</Link>
              <Link to="/flights" className="button button-outline">✈️ Search Flights</Link>
            </div>
          </div>
        ) : (
          bookings.map(booking => {
            const isHotel     = !!booking.hotelName;
            const isCancelled = booking.status === 'cancelled';

            return (
              <div key={booking.id} className="booking-premium-card">
                <div className="booking-details-col">
                  <div className="premium-section-header">
                    📋 Booking Details
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="booking-header-row">
                    <div className="booking-type-icon">
                      {isHotel ? '🏨' : '✈️'}
                    </div>
                    <div className="flex-1">
                      <p style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1a2340', margin: 0 }}>
                        {isHotel ? booking.hotelName : booking.airline}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#455a7a' }}>
                        {isHotel
                          ? `📍 ${booking.hotelLocation}`
                          : `🛫 ${booking.origin} → ${booking.destination}`}
                      </p>
                    </div>
                  </div>

                  <div className="booking-meta-grid">
                    {isHotel ? (
                      <>
                        <div className="booking-meta-item">
                          <span className="booking-meta-label">📅 Check-in</span>
                          <span className="booking-meta-value">
                            {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div className="booking-meta-item">
                          <span className="booking-meta-label">📅 Check-out</span>
                          <span className="booking-meta-value">
                            {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        {booking.roomType && (
                          <div className="booking-meta-item">
                            <span className="booking-meta-label">🛏️ Room Type</span>
                            <span className="booking-meta-value">{booking.roomType}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="booking-meta-item">
                          <span className="booking-meta-label">🛫 Departure</span>
                          <span className="booking-meta-value">
                            {new Date(booking.departureTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        {booking.seatNumber && (
                          <div className="booking-meta-item">
                            <span className="booking-meta-label">💺 Seat</span>
                            <span className="booking-meta-value">
                              {booking.seatNumber} <span style={{ fontSize: '0.8em', color: '#0071c2' }}>({booking.seatType})</span>
                            </span>
                          </div>
                        )}
                        <div className="booking-meta-item">
                          <span className="booking-meta-label">📅 Booking Date</span>
                          <span className="booking-meta-value">
                            {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="booking-meta-item">
                      <span className="booking-meta-label">🆔 Booking ID</span>
                      <span className="booking-meta-value">#{booking.id}</span>
                    </div>
                  </div>
                </div>

                {isCancelled ? (
                  <div className="booking-action-col">
                    <div className="premium-section-header" style={{ marginBottom: '12px' }}>🔄 Refund Center</div>
                    <RefundStatusTracker bookingId={booking.id} booking={booking} />
                  </div>
                ) : (
                  <div className="booking-action-col">
                    <div className="booking-action-header">
                      <span className="booking-action-title">Manage Booking</span>
                    </div>
                    <div className="booking-action-price">
                      <div className="booking-action-amount">${Number(booking.totalPrice).toFixed(2)}</div>
                      <div className="booking-action-label">Total Amount Paid</div>
                    </div>
                    <button
                      className="button button-danger"
                      onClick={() => setCancellingBooking(booking)}
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {cancellingBooking && (
        <div className="modal-overlay" onClick={() => setCancellingBooking(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCancellingBooking(null)} aria-label="Close">✕</button>
            <h3 className="modal-title">Cancel Booking</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
              This action cannot be undone. Your refund will be processed automatically.
            </p>

            <div className="alert alert-warn flex-col gap-2">
              <p className="modal-warn-text">Estimated Refund: ${estRefund.toFixed(2)} ({estPct}%)</p>
              <p className="modal-warn-detail">
                {estPct === 50 ? 'Booked within 24 hours — 50% refund applies.' : 'Booked more than 24 hours ago — 25% refund applies.'}
              </p>
            </div>

            <div className="form-field mt-4">
              <label htmlFor="cancelReason">Reason for cancellation</label>
              <select id="cancelReason" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                <option>Change of plans</option>
                <option>Found a better deal</option>
                <option>Flight delayed/cancelled</option>
                <option>Personal emergency</option>
                <option>Other</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="button button-ghost" onClick={() => setCancellingBooking(null)}>Go Back</button>
              <button className="button button-danger" onClick={handleConfirmCancel}>Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

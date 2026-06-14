import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createBooking, bookSeat, bookRoom } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import SeatMap from '../components/SeatMap.jsx';
import RoomSelection from '../components/RoomSelection.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nights, setNights] = useState(1);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const state = location.state || {};
  const {
    hotelId, hotelName, hotelLocation, pricePerNight,
    flightId, airline, origin, destination, departureTime, price,
    frozenPrice, pricingBreakdown, frozenExpiresAt,
  } = state;

  if (!user) {
    return (
      <div className="page-card">
        <h2 className="section-title">Booking</h2>
        <p className="text-muted">Please log in to proceed with booking.</p>
      </div>
    );
  }

  const isHotel = !!hotelId;
  const isFlight = !!flightId;

  const basePrice = isFlight ? (frozenPrice || price || 0) : (pricePerNight || 0);
  const seatUpgradeCost = selectedSeat ? selectedSeat.price - basePrice : 0;
  let totalPrice = 0;
  if (isFlight) {
    totalPrice = selectedSeat ? selectedSeat.price : basePrice;
  } else if (isHotel) {
    totalPrice = selectedRoom ? selectedRoom.price * (Number(nights) || 1) : basePrice * (Number(nights) || 1);
  }

  function handleNightsChange(e) {
    const raw = e.target.value;
    if (raw === '') {
      setNights('');
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1) {
      setNights(num);
    }
  }

  function handleSeatSelect(seat) {
    setSelectedSeat(seat);
  }

  async function handleConfirmBooking() {
    if (isHotel && (!checkIn || !checkOut)) {
      setError('Please select check-in and check-out dates.');
      return;
    }
    if (isHotel && !selectedRoom) {
      setError('Please select a room.');
      return;
    }
    if (isFlight && !selectedSeat) {
      setError('Please select a seat.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isFlight && selectedSeat) await bookSeat(selectedSeat.id);
      if (isHotel && selectedRoom) await bookRoom(selectedRoom.id);

      const bookingData = {
        ...(isHotel && { hotelId, checkIn, checkOut, roomId: selectedRoom.id }),
        ...(isFlight && { flightId, seatId: selectedSeat.id }),
        totalPrice,
      };

      await createBooking(bookingData);
      navigate('/my-bookings', { state: { message: 'Booking confirmed successfully!' } });
    } catch (err) {
      setError(err.message || 'Failed to confirm booking.');
    } finally {
      setLoading(false);
    }
  }

  const seatClassLabel = selectedSeat
    ? selectedSeat.type.charAt(0).toUpperCase() + selectedSeat.type.slice(1)
    : '';

  return (
    <div className="page-card">
      <h2 className="section-title">Booking Confirmation</h2>
      <p className="text-muted">Review and confirm your booking details.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {isFlight && (
        <div className="booking-flight-layout">
          <div className="booking-flight-summary">
            <div className="flight-summary-card">
              <h3>✈️ Flight Summary</h3>

              <div className="flight-route-display">
                <div className="flight-route-point">
                  <div className="flight-route-code">{origin}</div>
                  <div className="flight-route-label">Origin</div>
                </div>
                <div className="flight-route-line">
                  <div className="flight-route-arrow">→</div>
                </div>
                <div className="flight-route-point">
                  <div className="flight-route-code">{destination}</div>
                  <div className="flight-route-label">Destination</div>
                </div>
              </div>

              <div className="flight-summary-details">
                <div className="flight-summary-row">
                  <span className="flight-summary-label">Airline</span>
                  <span className="flight-summary-value">{airline}</span>
                </div>
                <div className="flight-summary-row">
                  <span className="flight-summary-label">Departure</span>
                  <span className="flight-summary-value">{new Date(departureTime).toLocaleString()}</span>
                </div>
                <div className="flight-summary-row">
                  <span className="flight-summary-label">Base Fare</span>
                  <span className="flight-summary-value">
                    {frozenPrice
                      ? <><span className="price-strikeout">${Number(price).toFixed(2)}</span> ${Number(frozenPrice).toFixed(2)}</>
                      : `$${Number(price).toFixed(2)}`
                    }
                    {frozenPrice && <span className="badge badge-frozen" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>🔒</span>}
                  </span>
                </div>
              </div>

              {pricingBreakdown && (
                <div className="pricing-section">
                  <PriceBreakdown pricing={pricingBreakdown} frozen={frozenPrice ? { frozenPrice, expiresAt: frozenExpiresAt } : null} />
                </div>
              )}
            </div>

            <div className="flight-summary-card">
              <h3>👤 Passenger Information</h3>
              <div className="passenger-info-grid">
                <div className="passenger-info-item">
                  <span className="passenger-info-label">Full Name</span>
                  <span className="passenger-info-value">{user.name}</span>
                </div>
                <div className="passenger-info-item">
                  <span className="passenger-info-label">Email</span>
                  <span className="passenger-info-value">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="flight-summary-card">
              <h3>💺 Seat Selection</h3>
              {selectedSeat ? (
                <div className="selected-seat-detail">
                  <div className="selected-seat-badge">
                    <span className="selected-seat-label">Selected Seat</span>
                    <span className={`selected-seat-number seat-type-badge-${selectedSeat.type}`}>{selectedSeat.seatNumber}</span>
                  </div>
                  <div className="selected-seat-info">
                    <div className="flight-summary-row">
                      <span className="flight-summary-label">Class</span>
                      <span className="flight-summary-value">{seatClassLabel}</span>
                    </div>
                    <div className="flight-summary-row">
                      <span className="flight-summary-label">Extra Cost</span>
                      <span className="flight-summary-value" style={{ color: seatUpgradeCost > 0 ? '#16a34a' : 'inherit' }}>
                        {seatUpgradeCost > 0 ? `+$${seatUpgradeCost.toFixed(2)}` : '$0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted font-small">Select a seat from the seat map to continue.</p>
              )}
            </div>

            <div className="flight-summary-card">
              <h3>💰 Price Summary</h3>
              <div className="price-breakdown-list">
                <div className="flight-summary-row">
                  <span className="flight-summary-label">Base Fare</span>
                  <span className="flight-summary-value">${Number(basePrice).toFixed(2)}</span>
                </div>
                <div className="flight-summary-row">
                  <span className="flight-summary-label">Seat Upgrade</span>
                  <span className="flight-summary-value" style={{ color: seatUpgradeCost > 0 ? '#16a34a' : '#94a3b8' }}>
                    {seatUpgradeCost > 0 ? `+$${seatUpgradeCost.toFixed(2)}` : '$0.00'}
                  </span>
                </div>
                <div className="flight-summary-total-row">
                  <span className="flight-summary-total-label">Total</span>
                  <span className="flight-summary-total-value">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-muted booking-for-text">
                Booking for: {user.name} ({user.email})
              </p>

              <div className="booking-flight-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </button>
                <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div className="booking-flight-seatmap">
            <div className="seat-map-card">
              <SeatMap flightId={flightId} selectedSeat={selectedSeat} onSeatSelect={handleSeatSelect} />
            </div>
          </div>
        </div>
      )}

      {isHotel && (
        <div className="card hotel-booking-card">
          <h3>Booking Summary</h3>

          <>
            <h4 className="hotel-booking-section-title">Hotel</h4>
            <p><strong>{hotelName}</strong></p>
            <p className="text-muted">{hotelLocation}</p>
            <p>
              {frozenPrice
                ? <><span className="price-strikeout">${Number(pricePerNight).toFixed(2)}</span> <strong className="price-frozen">${Number(frozenPrice).toFixed(2)}/night 🔒 Frozen</strong></>
                : <span>${Number(pricePerNight).toFixed(2)} per night</span>
              }
            </p>

            <div className="booking-date-fields">
              <div className="form-field">
                <label htmlFor="checkIn">Check-in Date</label>
                <input id="checkIn" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="checkOut">Check-out Date</label>
                <input id="checkOut" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="nights">Number of Nights</label>
                <input id="nights" type="number" min="1" value={nights} onChange={handleNightsChange} />
              </div>
            </div>

            <div className="room-select-section">
              <h4 className="hotel-booking-section-title">Select Room Type</h4>
              <RoomSelection hotelId={hotelId} selectedRoom={selectedRoom} onRoomSelect={setSelectedRoom} />
            </div>
          </>

          {pricingBreakdown && (
            <div className="pricing-section">
              <PriceBreakdown pricing={pricingBreakdown} frozen={frozenPrice ? { frozenPrice, expiresAt: frozenExpiresAt } : null} />
            </div>
          )}

          <div className="hotel-booking-total">
            <p><strong>Total Price: ${totalPrice.toFixed(2)}</strong></p>
            <p className="text-muted booking-for-text">Booking for: {user.name} ({user.email})</p>
          </div>

          <div className="hotel-booking-actions">
            <div className="card-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
              <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

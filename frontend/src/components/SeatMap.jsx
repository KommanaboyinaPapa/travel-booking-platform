import { useEffect, useState } from 'react';
import { getSeatsForFlight } from '../services/api.js';

const SECTION_ICONS = { business: '⭐', premium: '💎', economy: '🌐' };

export default function SeatMap({ flightId, selectedSeat, onSeatSelect }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSeats() {
      if (!flightId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getSeatsForFlight(flightId);
        setSeats(response.seats || []);
      } catch (err) {
        setError('Failed to load seats. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadSeats();
  }, [flightId]);

  if (loading) {
    return <div className="seat-map-loading">Loading seats...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (seats.length === 0) {
    return <div className="alert alert-error">No seats available for this flight.</div>;
  }

  // Group seats by row
  const rows = {};
  seats.forEach(seat => {
    const rowNum = parseInt(seat.seatNumber.slice(0, -1));
    if (!rows[rowNum]) rows[rowNum] = { seats: [], type: seat.type };
    rows[rowNum].seats.push(seat);
  });

  const rowNumbers = Object.keys(rows).map(Number).sort((a, b) => a - b);

  // Detect section transitions
  const sections = [];
  let currentSection = null;
  rowNumbers.forEach(rowNum => {
    const seatType = rows[rowNum].seats[0]?.type || 'economy';
    if (seatType !== currentSection) {
      currentSection = seatType;
      sections.push({ type: seatType, rows: [rowNum] });
    } else {
      sections[sections.length - 1].rows.push(rowNum);
    }
  });

  return (
    <div className="seat-map-container">
      <div className="seat-map-legend">
        <span className="legend-pill legend-pill-economy">Economy</span>
        <span className="legend-pill legend-pill-premium">Premium</span>
        <span className="legend-pill legend-pill-business">Business</span>
        <span className="legend-pill legend-pill-booked">Booked</span>
        <span className="legend-pill legend-pill-selected">Selected</span>
      </div>

      <div className="airplane-cabin">
        <div className="cabin-nose">
          <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
            <path d="M20 0 Q40 0 40 8 Q40 16 20 16 Q0 16 0 8 Q0 0 20 0Z" fill="#cbd5e1" />
          </svg>
        </div>
        <div className="cabin-label cabin-front">⬆ FRONT</div>

        {sections.map(section => (
          <div key={section.type}>
            <div className={`seat-section-label seat-section-${section.type}`}>
              {SECTION_ICONS[section.type]} {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
            </div>
            {section.rows.map(rowNum => {
              const rowSeats = rows[rowNum].seats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
              const leftSeats = rowSeats.filter(s => ['A', 'B', 'C'].includes(s.seatNumber.slice(-1)));
              const rightSeats = rowSeats.filter(s => ['D', 'E', 'F'].includes(s.seatNumber.slice(-1)));

              return (
                <div key={rowNum} className="seat-row">
                  <div className="seat-row-number">{rowNum}</div>
                  <div className="seat-group">
                    {leftSeats.map(seat => (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={seat.status === 'booked'}
                        className={`seat seat-${seat.type} seat-${seat.status} ${selectedSeat?.id === seat.id ? 'seat-selected' : ''}`}
                        onClick={() => onSeatSelect(seat)}
                        title={`Seat ${seat.seatNumber} (${seat.type}) - $${seat.price}`}
                      >
                        {seat.seatNumber.slice(-1)}
                      </button>
                    ))}
                  </div>
                  <div className="aisle-gap" />
                  <div className="seat-group">
                    {rightSeats.map(seat => (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={seat.status === 'booked'}
                        className={`seat seat-${seat.type} seat-${seat.status} ${selectedSeat?.id === seat.id ? 'seat-selected' : ''}`}
                        onClick={() => onSeatSelect(seat)}
                        title={`Seat ${seat.seatNumber} (${seat.type}) - $${seat.price}`}
                      >
                        {seat.seatNumber.slice(-1)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="cabin-label cabin-back">⬇ BACK</div>
        <div className="cabin-tail">
          <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
            <path d="M16 12 Q32 12 32 6 Q32 0 16 0 Q0 0 0 6 Q0 12 16 12Z" fill="#cbd5e1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

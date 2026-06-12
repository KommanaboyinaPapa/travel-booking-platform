import { useEffect, useState } from 'react';
import { getRoomsForHotel } from '../services/api.js';

export default function RoomSelection({ hotelId, selectedRoom, onRoomSelect }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRooms() {
      if (!hotelId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await getRoomsForHotel(hotelId);
        setRooms(response.rooms || []);
      } catch (err) {
        setError('Failed to load rooms. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, [hotelId]);

  if (loading) {
    return <div className="room-selection-loading">Loading available rooms...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (rooms.length === 0) {
    return <div className="alert alert-error">No rooms available for this hotel.</div>;
  }

  return (
    <div className="room-selection-container">
      <div className="room-grid">
        {rooms.map(room => {
          const isSelected = selectedRoom?.id === room.id;
          const isSoldOut = room.availability <= 0;
          
          return (
            <div 
              key={room.id} 
              className={`room-card ${isSelected ? 'selected' : ''} ${isSoldOut ? 'sold-out' : ''}`}
              onClick={() => {
                if (!isSoldOut) {
                  onRoomSelect(room);
                }
              }}
            >
              <div className="room-image" style={{ backgroundImage: `url(${room.imageUrl})` }}>
                {isSoldOut && <div className="sold-out-overlay">Sold Out</div>}
                {isSelected && <div className="selected-badge">✓ Selected</div>}
              </div>
              <div className="room-details">
                <h5 className="room-title">{room.roomType}</h5>
                <div className="room-price">${room.price} <span className="text-muted">/ night</span></div>
                <div className="room-availability">
                  {isSoldOut ? (
                    <span className="text-error">No rooms left</span>
                  ) : (
                    <span className={room.availability < 5 ? 'text-warning' : 'text-success'}>
                      {room.availability} room{room.availability !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

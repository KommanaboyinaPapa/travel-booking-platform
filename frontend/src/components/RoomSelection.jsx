import { useEffect, useMemo, useState } from 'react';
import { getRoomsForHotel } from '../services/api.js';

const ROOM_TYPE_PREF_KEY = 'travel_preferred_room_type';

export default function RoomSelection({ hotelId, selectedRoom, onRoomSelect }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const preferredRoomType = useMemo(() => {
    try { return localStorage.getItem(ROOM_TYPE_PREF_KEY); } catch { return null; }
  }, []);

  useEffect(() => {
    async function loadRooms() {
      if (!hotelId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await getRoomsForHotel(hotelId);
        const roomList = response.rooms || [];
        setRooms(roomList);
      } catch (err) {
        setError('Failed to load rooms. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, [hotelId]);

  // Auto-select preferred room type when rooms load and no room is selected yet
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom && preferredRoomType) {
      const match = rooms.find(r => r.roomType?.toLowerCase() === preferredRoomType.toLowerCase() && r.availability > 0);
      if (match) onRoomSelect(match);
    }
  }, [rooms]);

  // Save room type preference on selection
  useEffect(() => {
    if (selectedRoom?.roomType) {
      try { localStorage.setItem(ROOM_TYPE_PREF_KEY, selectedRoom.roomType); } catch { /* ignore */ }
    }
  }, [selectedRoom?.roomType]);

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

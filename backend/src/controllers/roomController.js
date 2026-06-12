import pool from '../config/db.js';
import { fallbackRooms } from '../services/roomService.js';

export async function getRoomsForHotel(req, res) {
  const hotelId = Number(req.params.hotelId);
  
  try {
    const [rows] = await pool.query(
      'SELECT id, hotel_id AS hotelId, room_type AS roomType, price, image_url AS imageUrl, availability, created_at AS createdAt FROM rooms WHERE hotel_id = ? ORDER BY price ASC',
      [hotelId]
    );

    if (rows.length > 0) {
      return res.json({ rooms: rows });
    }
    
    throw new Error('No rooms found in DB');
  } catch (err) {
    console.warn(`Using fallback rooms for hotel ${hotelId} (DB unavailable or empty)`);
    const rooms = fallbackRooms.filter(r => r.hotelId === hotelId);
    return res.json({ rooms });
  }
}

export async function getRoom(req, res) {
  const roomId = Number(req.params.roomId);

  try {
    const [rows] = await pool.query(
      'SELECT id, hotel_id AS hotelId, room_type AS roomType, price, image_url AS imageUrl, availability, created_at AS createdAt FROM rooms WHERE id = ?',
      [roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    return res.json({ room: rows[0] });
  } catch (err) {
    console.warn('Using fallback room (DB unavailable)');
    const room = fallbackRooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    return res.json({ room });
  }
}

export async function bookRoom(req, res) {
  const roomId = Number(req.params.roomId);
  
  try {
    const [rows] = await pool.query('SELECT availability FROM rooms WHERE id = ?', [roomId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    if (rows[0].availability <= 0) {
      return res.status(409).json({ message: 'Room type is fully booked.' });
    }

    await pool.query('UPDATE rooms SET availability = availability - 1 WHERE id = ?', [roomId]);
    return res.json({ message: 'Room booked successfully.' });
  } catch (err) {
    console.warn('Using fallback room booking (DB unavailable)');
    const room = fallbackRooms.find(r => r.id === roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    if (room.availability <= 0) {
      return res.status(409).json({ message: 'Room type is fully booked.' });
    }
    
    room.availability -= 1;
    return res.json({ message: 'Room booked successfully.' });
  }
}

export async function releaseRoom(req, res) {
  const roomId = Number(req.params.roomId);
  
  try {
    const [rows] = await pool.query('SELECT id FROM rooms WHERE id = ?', [roomId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    await pool.query('UPDATE rooms SET availability = availability + 1 WHERE id = ?', [roomId]);
    return res.json({ message: 'Room released successfully.' });
  } catch (err) {
    console.warn('Using fallback room releasing (DB unavailable)');
    const room = fallbackRooms.find(r => r.id === roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    room.availability += 1;
    return res.json({ message: 'Room released successfully.' });
  }
}

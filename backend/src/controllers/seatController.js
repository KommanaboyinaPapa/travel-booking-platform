import pool from '../config/db.js';
import { fallbackSeats } from '../services/seatService.js';
import { getFlightById } from '../services/flightService.js';

export async function getSeatsForFlight(req, res) {
  const flightId = Number(req.params.flightId);
  
  try {
    const [rows] = await pool.query(
      'SELECT id, flight_id AS flightId, seat_number AS seatNumber, type, price, status, created_at AS createdAt FROM seats WHERE flight_id = ? ORDER BY id ASC',
      [flightId]
    );

    if (rows.length > 0) {
      return res.json({ seats: rows });
    }
    
    // If DB is running but no seats seeded, we might still fall back
    throw new Error('No seats found in DB');
  } catch (err) {
    console.warn(`Using fallback seats for flight ${flightId} (DB unavailable or empty)`);
    const seats = fallbackSeats.filter(s => s.flightId === flightId);
    return res.json({ seats });
  }
}

export async function getSeat(req, res) {
  const seatId = Number(req.params.seatId);

  try {
    const [rows] = await pool.query(
      'SELECT id, flight_id AS flightId, seat_number AS seatNumber, type, price, status, created_at AS createdAt FROM seats WHERE id = ?',
      [seatId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Seat not found.' });
    }

    return res.json({ seat: rows[0] });
  } catch (err) {
    console.warn('Using fallback seat (DB unavailable)');
    const seat = fallbackSeats.find(s => s.id === seatId);
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found.' });
    }
    return res.json({ seat });
  }
}

export async function bookSeat(req, res) {
  const seatId = Number(req.params.seatId);
  
  try {
    const [rows] = await pool.query('SELECT status FROM seats WHERE id = ?', [seatId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Seat not found.' });
    }
    
    if (rows[0].status === 'booked') {
      return res.status(409).json({ message: 'Seat is already booked.' });
    }

    await pool.query('UPDATE seats SET status = "booked" WHERE id = ?', [seatId]);
    return res.json({ message: 'Seat booked successfully.' });
  } catch (err) {
    console.warn('Using fallback seat booking (DB unavailable)');
    const seat = fallbackSeats.find(s => s.id === seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found.' });
    }
    if (seat.status === 'booked') {
      return res.status(409).json({ message: 'Seat is already booked.' });
    }
    
    seat.status = 'booked';
    return res.json({ message: 'Seat booked successfully.' });
  }
}

export async function releaseSeat(req, res) {
  const seatId = Number(req.params.seatId);
  
  try {
    const [rows] = await pool.query('SELECT status FROM seats WHERE id = ?', [seatId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Seat not found.' });
    }
    
    if (rows[0].status === 'available') {
      return res.status(400).json({ message: 'Seat is already available.' });
    }

    await pool.query('UPDATE seats SET status = "available" WHERE id = ?', [seatId]);
    return res.json({ message: 'Seat released successfully.' });
  } catch (err) {
    console.warn('Using fallback seat releasing (DB unavailable)');
    const seat = fallbackSeats.find(s => s.id === seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found.' });
    }
    if (seat.status === 'available') {
      return res.status(400).json({ message: 'Seat is already available.' });
    }
    
    seat.status = 'available';
    return res.json({ message: 'Seat released successfully.' });
  }
}

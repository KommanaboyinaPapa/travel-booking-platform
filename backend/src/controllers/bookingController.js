import pool from '../config/db.js';
import { getActiveFallbackFreeze, fallbackFreezes } from '../services/dynamicPricingService.js';

// Fallback in-memory bookings, cancellations, and refunds stores
export const fallbackBookings = [];
export const fallbackCancellations = [];
export const fallbackRefunds = [];
import { fallbackHotels } from './hotelController.js';
import { fallbackFlights } from '../services/flightService.js';
import { fallbackSeats } from '../services/seatService.js';
import { fallbackRooms } from '../services/roomService.js';
export let bookingIdCounter = 1;
export let cancellationIdCounter = 1;
export let refundIdCounter = 1;

// Resolve frozen price from DB or fallback store
async function resolveFrozenPrice(userId, entityType, entityId) {
  try {
    const [[row]] = await pool.query(
      `SELECT frozen_price FROM price_freeze
       WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [userId, entityType, Number(entityId)]
    );
    return row ? Number(row.frozen_price) : null;
  } catch {
    const freeze = getActiveFallbackFreeze(userId, entityType, Number(entityId));
    return freeze ? freeze.frozenPrice : null;
  }
}

export async function createBooking(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  const { hotelId, flightId, seatId, roomId, checkIn, checkOut, totalPrice } = req.body;
  if ((!hotelId && !flightId) || !totalPrice) {
    return res.status(400).json({ message: 'hotelId or flightId and totalPrice are required.' });
  }

  // Apply frozen price if available
  let resolvedPrice = totalPrice;
  try {
    const entityType = hotelId ? 'hotel' : 'flight';
    const entityId   = hotelId || flightId;
    const frozen = await resolveFrozenPrice(userId, entityType, entityId);
    if (frozen !== null) resolvedPrice = frozen;
  } catch { /* use submitted price */ }

  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (user_id, hotel_id, flight_id, seat_id, room_id, check_in, check_out, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, hotelId || null, flightId || null, seatId || null, roomId || null, checkIn || null, checkOut || null, resolvedPrice, 'confirmed']
    );

    const [rows] = await pool.query('SELECT id, user_id AS userId, hotel_id AS hotelId, flight_id AS flightId, seat_id AS seatId, room_id AS roomId, check_in AS checkIn, check_out AS checkOut, total_price AS totalPrice, status, created_at AS createdAt FROM bookings WHERE id = ?', [result.insertId]);
    return res.status(201).json({ message: 'Booking created successfully.', booking: rows[0] });
  } catch (err) {
    console.warn('Using fallback bookings (DB unavailable)');
    const booking = {
      id: bookingIdCounter++,
      userId,
      hotelId: hotelId || null,
      flightId: flightId || null,
      seatId: seatId || null,
      roomId: roomId || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      totalPrice: resolvedPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    fallbackBookings.push(booking);
    return res.status(201).json({ message: 'Booking created successfully.', booking });
  }
}

export async function listBookings(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.user_id AS userId, b.hotel_id AS hotelId, b.flight_id AS flightId, 
              b.seat_id AS seatId, b.room_id AS roomId,
              b.check_in AS checkIn, b.check_out AS checkOut, b.total_price AS totalPrice, 
              b.status, b.created_at AS createdAt,
              h.name AS hotelName, h.location AS hotelLocation,
              f.airline, f.origin, f.destination, f.departure_time AS departureTime,
              s.seat_number AS seatNumber, s.type AS seatType,
              r.room_type AS roomType
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN flights f ON b.flight_id = f.id
       LEFT JOIN seats s ON b.seat_id = s.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.json({ bookings: rows });
  } catch (err) {
    console.warn('Using fallback bookings (DB unavailable)');
    const userBookings = fallbackBookings
      .filter(b => b.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(b => {
        const hotel = fallbackHotels.find(h => h.id === b.hotelId);
        const flight = fallbackFlights.find(f => f.id === b.flightId);
        const room = fallbackRooms.find(r => r.id === b.roomId);
        const seat = fallbackSeats.find(s => s.id === b.seatId);
        
        return {
          ...b,
          hotelName: hotel ? hotel.name : null,
          hotelLocation: hotel ? hotel.location : null,
          airline: flight ? flight.airline : null,
          origin: flight ? flight.origin : null,
          destination: flight ? flight.destination : null,
          departureTime: flight ? flight.departureTime : null,
          roomType: room ? room.roomType : null,
          seatNumber: seat ? seat.seatNumber : null,
          seatType: seat ? seat.type : null,
        };
      });
    return res.json({ bookings: userBookings });
  }
}

export async function getBooking(req, res) {
  const userId = req.user?.id;
  const bookingId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.user_id AS userId, b.hotel_id AS hotelId, b.flight_id AS flightId,
              b.seat_id AS seatId, b.room_id AS roomId,
              b.check_in AS checkIn, b.check_out AS checkOut, b.total_price AS totalPrice,
              b.status, b.created_at AS createdAt,
              h.name AS hotelName, h.location AS hotelLocation, h.price_per_night AS hotelPrice,
              f.airline, f.origin, f.destination, f.departure_time AS departureTime, f.price AS flightPrice,
              s.seat_number AS seatNumber, s.type AS seatType,
              r.room_type AS roomType
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN flights f ON b.flight_id = f.id
       LEFT JOIN seats s ON b.seat_id = s.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ? AND b.user_id = ?`,
      [bookingId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    return res.json({ booking: rows[0] });
  } catch (err) {
    console.warn('Using fallback booking (DB unavailable)');
    let booking = fallbackBookings.find(b => b.id === Number(bookingId) && b.userId === userId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    const hotel = fallbackHotels.find(h => h.id === booking.hotelId);
    const flight = fallbackFlights.find(f => f.id === booking.flightId);
    const room = fallbackRooms.find(r => r.id === booking.roomId);
    const seat = fallbackSeats.find(s => s.id === booking.seatId);
    
    booking = {
      ...booking,
      hotelName: hotel ? hotel.name : null,
      hotelLocation: hotel ? hotel.location : null,
      hotelPrice: hotel ? hotel.pricePerNight : null,
      airline: flight ? flight.airline : null,
      origin: flight ? flight.origin : null,
      destination: flight ? flight.destination : null,
      departureTime: flight ? flight.departureTime : null,
      flightPrice: flight ? flight.price : null,
      roomType: room ? room.roomType : null,
      seatNumber: seat ? seat.seatNumber : null,
      seatType: seat ? seat.type : null,
    };
    
    return res.json({ booking });
  }
}

export async function cancelBooking(req, res) {
  const userId = req.user?.id;
  const bookingId = req.params.id;
  const { reason = 'Change of plans' } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  try {
    // 1. Fetch booking
    const [bookings] = await pool.query(
      'SELECT id, user_id AS userId, total_price AS totalPrice, status, created_at AS createdAt FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // 2. Verify booking is not already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    // 3. Calculate refund rules
    const bookingCreatedAt = new Date(booking.createdAt);
    const now = new Date();
    const diffHours = (now - bookingCreatedAt) / (1000 * 60 * 60);
    const refundPercentage = diffHours <= 24 ? 50 : 25;
    const refundAmount = Number((booking.totalPrice * (refundPercentage / 100)).toFixed(2));

    // 4. Calculate expected completion date (7 days from now)
    const expectedCompletionDate = new Date();
    expectedCompletionDate.setDate(expectedCompletionDate.getDate() + 7);

    // 5. Update database inside sequential queries
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]);
    await pool.query(
      'INSERT INTO cancellations (booking_id, user_id, reason, cancelled_at) VALUES (?, ?, ?, ?)',
      [bookingId, userId, reason, now]
    );
    await pool.query(
      'INSERT INTO refunds (booking_id, refund_amount, refund_percentage, status, expected_completion_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [bookingId, refundAmount, refundPercentage, 'Pending', expectedCompletionDate, now]
    );

    return res.status(200).json({
      message: 'Booking cancelled and refund processed successfully.',
      cancellation: {
        bookingId: Number(bookingId),
        userId,
        reason,
        cancelledAt: now.toISOString(),
      },
      refund: {
        bookingId: Number(bookingId),
        refundAmount,
        refundPercentage,
        status: 'Pending',
        expectedCompletionDate: expectedCompletionDate.toISOString(),
        createdAt: now.toISOString(),
      }
    });
  } catch (err) {
    console.warn('DB error on cancel booking, falling back to in-memory store:', err.message || err);

    // Fallback logic
    const booking = fallbackBookings.find(b => b.id === Number(bookingId) && b.userId === userId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    // Calculate refund
    const bookingCreatedAt = new Date(booking.createdAt);
    const now = new Date();
    const diffHours = (now - bookingCreatedAt) / (1000 * 60 * 60);
    const refundPercentage = diffHours <= 24 ? 50 : 25;
    const refundAmount = Number((booking.totalPrice * (refundPercentage / 100)).toFixed(2));

    const expectedCompletionDate = new Date();
    expectedCompletionDate.setDate(expectedCompletionDate.getDate() + 7);

    // Update fallback store
    booking.status = 'cancelled';

    const cancellation = {
      id: cancellationIdCounter++,
      bookingId: booking.id,
      userId,
      reason,
      cancelledAt: now.toISOString(),
    };
    fallbackCancellations.push(cancellation);

    const refund = {
      id: refundIdCounter++,
      bookingId: booking.id,
      refundAmount,
      refundPercentage,
      status: 'Pending',
      expectedCompletionDate: expectedCompletionDate.toISOString(),
      createdAt: now.toISOString(),
    };
    fallbackRefunds.push(refund);

    return res.status(200).json({
      message: 'Booking cancelled and refund processed successfully (fallback).',
      cancellation,
      refund,
    });
  }
}

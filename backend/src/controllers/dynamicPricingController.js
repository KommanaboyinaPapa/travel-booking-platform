import pool from '../config/db.js';
import {
  calculateDynamicPrice,
  fallbackFreezes,
  createFreezeFallback,
  getActiveFallbackFreeze,
  FREEZE_DURATION_MS,
} from '../services/dynamicPricingService.js';
import { fallbackFlights } from '../services/flightService.js';

const fallbackHotels = [
  { id: 1, name: 'Luxury Sunset Resort',   pricePerNight: 250.00, availableRooms: 50 },
  { id: 2, name: 'Mountain View Lodge',     pricePerNight: 150.00, availableRooms: 30 },
  { id: 3, name: 'Downtown Urban Hotel',    pricePerNight: 300.00, availableRooms: 40 },
  { id: 4, name: 'Tropical Paradise Hotel', pricePerNight: 200.00, availableRooms: 35 },
  { id: 5, name: 'Desert Oasis Resort',     pricePerNight: 180.00, availableRooms: 25 },
];

async function resolveEntity(entityType, entityId, req) {
  let basePrice, entityName, occupancyRate;

  if (entityType === 'hotel') {
    try {
      const [rows] = await pool.query(
        'SELECT name, price_per_night, available_rooms FROM hotels WHERE id = ?',
        [entityId]
      );
      if (rows.length === 0) throw Object.assign(new Error('Hotel not found.'), { status: 404 });
      const h = rows[0];
      basePrice = Number(h.price_per_night);
      entityName = h.name;
      const [[{ total }]] = await pool.query(
        `SELECT COALESCE(SUM(availability), 0) AS total FROM rooms WHERE hotel_id = ?`,
        [entityId]
      );
      occupancyRate = Math.max(0, 1 - (Number(total) || Number(h.available_rooms)) / (Number(h.available_rooms) * 3 || 1));
    } catch (err) {
      if (err.status) throw err;
      const h = fallbackHotels.find(x => x.id === Number(entityId));
      if (!h) throw Object.assign(new Error('Hotel not found.'), { status: 404 });
      basePrice = h.pricePerNight; entityName = h.name; occupancyRate = 0.5;
    }
  } else {
    try {
      const [rows] = await pool.query(
        'SELECT airline, origin, destination, price FROM flights WHERE id = ?',
        [entityId]
      );
      if (rows.length === 0) throw Object.assign(new Error('Flight not found.'), { status: 404 });
      const f = rows[0];
      basePrice = Number(f.price);
      entityName = `${f.airline} (${f.origin} → ${f.destination})`;
      const [[{ total, booked }]] = await pool.query(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS booked FROM seats WHERE flight_id = ?`,
        [entityId]
      );
      occupancyRate = Number(total) > 0 ? Number(booked) / Number(total) : 0;
    } catch (err) {
      if (err.status) throw err;
      const f = fallbackFlights.find(x => x.id === Number(entityId));
      if (!f) throw Object.assign(new Error('Flight not found.'), { status: 404 });
      basePrice = f.price; entityName = `${f.airline} (${f.origin} → ${f.destination})`; occupancyRate = 0.15;
    }
  }

  return { basePrice, entityName, occupancyRate };
}

// POST /api/pricing/calculate
export async function calculatePrice(req, res) {
  try {
    const { entityType, entityId, date } = req.body;
    if (!entityType || !entityId) return res.status(400).json({ message: 'Missing required fields: entityType, entityId.' });
    if (!['hotel', 'flight'].includes(entityType)) return res.status(400).json({ message: 'entityType must be "hotel" or "flight".' });

    const { basePrice, entityName, occupancyRate } = await resolveEntity(entityType, Number(entityId), req);
    const result = calculateDynamicPrice(basePrice, { date: date || new Date(), occupancyRate });

    return res.json({
      entityType, entityId: Number(entityId), entityName,
      basePrice: result.basePrice,
      adjustmentPercent: result.adjustmentPercent,
      adjustmentReasons: result.adjustmentReasons,
      finalPrice: result.finalPrice,
      breakdown: result.breakdown,
      date: (date ? new Date(date) : new Date()).toISOString().split('T')[0],
    });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

// POST /api/pricing/freeze
export async function freezePrice(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const { entityType, entityId, date } = req.body;
    if (!entityType || !entityId) return res.status(400).json({ message: 'Missing required fields: entityType, entityId.' });
    if (!['hotel', 'flight'].includes(entityType)) return res.status(400).json({ message: 'entityType must be "hotel" or "flight".' });

    const { basePrice, occupancyRate } = await resolveEntity(entityType, Number(entityId), req);
    const { finalPrice } = calculateDynamicPrice(basePrice, { date: date || new Date(), occupancyRate });

    const expiresAt = new Date(Date.now() + FREEZE_DURATION_MS);

    try {
      // Remove any existing active freeze for this user+entity
      await pool.query(
        'DELETE FROM price_freeze WHERE user_id = ? AND entity_type = ? AND entity_id = ?',
        [userId, entityType, Number(entityId)]
      );
      const [result] = await pool.query(
        'INSERT INTO price_freeze (user_id, entity_type, entity_id, frozen_price, expires_at) VALUES (?, ?, ?, ?, ?)',
        [userId, entityType, Number(entityId), finalPrice, expiresAt]
      );
      const [[freeze]] = await pool.query(
        'SELECT id, user_id AS userId, entity_type AS entityType, entity_id AS entityId, frozen_price AS frozenPrice, expires_at AS expiresAt, created_at AS createdAt FROM price_freeze WHERE id = ?',
        [result.insertId]
      );
      return res.status(201).json({ message: 'Price frozen successfully.', freeze });
    } catch {
      const freeze = createFreezeFallback(userId, entityType, Number(entityId), finalPrice);
      return res.status(201).json({ message: 'Price frozen successfully.', freeze });
    }
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

// GET /api/pricing/freeze/:entityType/:entityId
export async function getFrozenPrice(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const { entityType, entityId } = req.params;
    if (!['hotel', 'flight'].includes(entityType)) return res.status(400).json({ message: 'Invalid entityType.' });

    try {
      const [[freeze]] = await pool.query(
        `SELECT id, user_id AS userId, entity_type AS entityType, entity_id AS entityId,
                frozen_price AS frozenPrice, expires_at AS expiresAt, created_at AS createdAt
         FROM price_freeze
         WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [userId, entityType, Number(entityId)]
      );
      if (!freeze) return res.json({ freeze: null });
      return res.json({ freeze });
    } catch {
      const freeze = getActiveFallbackFreeze(userId, entityType, Number(entityId));
      return res.json({ freeze: freeze || null });
    }
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

// DELETE /api/pricing/freeze/:entityType/:entityId
export async function deleteFreeze(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const { entityType, entityId } = req.params;

    try {
      await pool.query(
        'DELETE FROM price_freeze WHERE user_id = ? AND entity_type = ? AND entity_id = ?',
        [userId, entityType, Number(entityId)]
      );
    } catch {
      const idx = fallbackFreezes.findIndex(
        f => f.userId === Number(userId) && f.entityType === entityType && f.entityId === Number(entityId)
      );
      if (idx !== -1) fallbackFreezes.splice(idx, 1);
    }
    return res.json({ message: 'Price freeze removed.' });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

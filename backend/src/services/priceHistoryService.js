import pool from '../config/db.js';

// ---------------------------------------------------------------------------
// Fallback in-memory store (used when DB is unavailable)
// ---------------------------------------------------------------------------
export const fallbackPriceHistory = [];
let fallbackIdCounter = 1;

// ---------------------------------------------------------------------------
// Record a price change
// ---------------------------------------------------------------------------
export async function recordPriceChange(entityType, entityId, oldPrice, newPrice) {
  // Skip if price didn't actually change
  if (Number(oldPrice) === Number(newPrice)) return null;

  try {
    const [result] = await pool.query(
      'INSERT INTO price_history (entity_type, entity_id, old_price, new_price) VALUES (?, ?, ?, ?)',
      [entityType, entityId, oldPrice, newPrice]
    );
    return result.insertId;
  } catch (err) {
    console.warn('Recording price change in fallback store:', err.message || err);
    const entry = {
      id: fallbackIdCounter++,
      entityType,
      entityId: Number(entityId),
      oldPrice: Number(oldPrice),
      newPrice: Number(newPrice),
      changedAt: new Date().toISOString(),
    };
    fallbackPriceHistory.push(entry);
    return entry.id;
  }
}

// ---------------------------------------------------------------------------
// Fetch hotel price history
// ---------------------------------------------------------------------------
export async function getHotelPriceHistory(hotelId, { limit = 50, offset = 0 } = {}) {
  try {
    const [rows] = await pool.query(
      `SELECT ph.id, ph.entity_type AS entityType, ph.entity_id AS entityId,
              ph.old_price AS oldPrice, ph.new_price AS newPrice,
              ph.changed_at AS changedAt,
              h.name AS hotelName, h.location
       FROM price_history ph
       JOIN hotels h ON h.id = ph.entity_id
       WHERE ph.entity_type = 'hotel' AND ph.entity_id = ?
       ORDER BY ph.changed_at DESC
       LIMIT ? OFFSET ?`,
      [hotelId, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM price_history WHERE entity_type = 'hotel' AND entity_id = ?`,
      [hotelId]
    );

    return { history: rows, total };
  } catch (err) {
    console.warn('Using fallback hotel price history:', err.message || err);
    const filtered = fallbackPriceHistory
      .filter(e => e.entityType === 'hotel' && e.entityId === Number(hotelId))
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
    const page = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return { history: page, total: filtered.length };
  }
}

// ---------------------------------------------------------------------------
// Fetch flight price history
// ---------------------------------------------------------------------------
export async function getFlightPriceHistory(flightId, { limit = 50, offset = 0 } = {}) {
  try {
    const [rows] = await pool.query(
      `SELECT ph.id, ph.entity_type AS entityType, ph.entity_id AS entityId,
              ph.old_price AS oldPrice, ph.new_price AS newPrice,
              ph.changed_at AS changedAt,
              f.airline, f.origin, f.destination
       FROM price_history ph
       JOIN flights f ON f.id = ph.entity_id
       WHERE ph.entity_type = 'flight' AND ph.entity_id = ?
       ORDER BY ph.changed_at DESC
       LIMIT ? OFFSET ?`,
      [flightId, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM price_history WHERE entity_type = 'flight' AND entity_id = ?`,
      [flightId]
    );

    return { history: rows, total };
  } catch (err) {
    console.warn('Using fallback flight price history:', err.message || err);
    const filtered = fallbackPriceHistory
      .filter(e => e.entityType === 'flight' && e.entityId === Number(flightId))
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
    const page = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return { history: page, total: filtered.length };
  }
}

// ---------------------------------------------------------------------------
// Update price on the source table and record the change
// ---------------------------------------------------------------------------
export async function updateEntityPrice(entityType, entityId, newPrice) {
  if (!['hotel', 'flight'].includes(entityType)) {
    throw Object.assign(new Error('Invalid entity type. Must be "hotel" or "flight".'), { status: 400 });
  }

  const numericNewPrice = Number(newPrice);
  if (isNaN(numericNewPrice) || numericNewPrice < 0) {
    throw Object.assign(new Error('Invalid price value.'), { status: 400 });
  }

  try {
    // 1. Fetch current price
    let oldPrice;
    if (entityType === 'hotel') {
      const [rows] = await pool.query('SELECT price_per_night FROM hotels WHERE id = ?', [entityId]);
      if (rows.length === 0) throw Object.assign(new Error('Hotel not found.'), { status: 404 });
      oldPrice = Number(rows[0].price_per_night);
    } else {
      const [rows] = await pool.query('SELECT price FROM flights WHERE id = ?', [entityId]);
      if (rows.length === 0) throw Object.assign(new Error('Flight not found.'), { status: 404 });
      oldPrice = Number(rows[0].price);
    }

    // 2. Skip if price hasn't changed
    if (oldPrice === numericNewPrice) {
      return { changed: false, oldPrice, newPrice: numericNewPrice };
    }

    // 3. Update source table
    if (entityType === 'hotel') {
      await pool.query('UPDATE hotels SET price_per_night = ? WHERE id = ?', [numericNewPrice, entityId]);
    } else {
      await pool.query('UPDATE flights SET price = ? WHERE id = ?', [numericNewPrice, entityId]);
    }

    // 4. Record history
    await recordPriceChange(entityType, entityId, oldPrice, numericNewPrice);

    return { changed: true, oldPrice, newPrice: numericNewPrice };
  } catch (err) {
    // Re-throw structured errors
    if (err.status) throw err;

    console.warn('Using fallback price update:', err.message || err);

    // Fallback: work with the in-memory fallback data from controllers
    throw Object.assign(new Error('Database unavailable for price update.'), { status: 503 });
  }
}

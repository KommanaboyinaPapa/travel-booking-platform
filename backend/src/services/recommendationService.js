import pool from '../config/db.js';

// ---------------------------------------------------------------------------
// Destination affinity map — keywords in location/destination → suggested destinations
// ---------------------------------------------------------------------------
const DESTINATION_AFFINITIES = [
  { keywords: ['beach', 'miami', 'cancun', 'hawaii', 'maldives', 'bahamas', 'bali'], suggests: ['Bali, Indonesia', 'Maldives', 'Cancun, Mexico', 'Miami, FL'] },
  { keywords: ['mountain', 'aspen', 'denver', 'swiss', 'alps', 'vail', 'park city'], suggests: ['Swiss Alps', 'Aspen, CO', 'Banff, Canada', 'Queenstown, NZ'] },
  { keywords: ['city', 'urban', 'downtown', 'new york', 'london', 'paris', 'chicago'], suggests: ['Paris, France', 'New York, NY', 'Tokyo, Japan', 'London, UK'] },
  { keywords: ['desert', 'phoenix', 'las vegas', 'dubai', 'cairo', 'marrakech'], suggests: ['Dubai, UAE', 'Marrakech, Morocco', 'Sedona, AZ', 'Petra, Jordan'] },
  { keywords: ['tropical', 'caribbean', 'phuket', 'fiji', 'costa rica', 'belize'], suggests: ['Phuket, Thailand', 'Fiji Islands', 'Costa Rica', 'Belize'] },
  { keywords: ['europe', 'rome', 'barcelona', 'amsterdam', 'prague', 'vienna'], suggests: ['Rome, Italy', 'Barcelona, Spain', 'Amsterdam, Netherlands', 'Prague, Czech Republic'] },
];

// ---------------------------------------------------------------------------
// Extract tags from a location/destination string
// ---------------------------------------------------------------------------
function extractTags(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tags = [];
  for (const affinity of DESTINATION_AFFINITIES) {
    if (affinity.keywords.some(k => lower.includes(k))) {
      tags.push(...affinity.keywords.filter(k => lower.includes(k)));
    }
  }
  return [...new Set(tags)];
}

// ---------------------------------------------------------------------------
// Suggest destinations from a set of location tags (deduplicated)
// ---------------------------------------------------------------------------
function suggestDestinations(tags) {
  const seen = new Set();
  const results = [];
  for (const affinity of DESTINATION_AFFINITIES) {
    if (tags.some(t => affinity.keywords.includes(t))) {
      for (const dest of affinity.suggests) {
        if (!seen.has(dest)) { seen.add(dest); results.push(dest); }
      }
    }
  }
  return results.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Build reason string for a recommendation
// ---------------------------------------------------------------------------
function buildReason(type, entity, tags) {
  if (type === 'destination') {
    return `Based on your previous ${tags.join(', ')} bookings`;
  }
  if (type === 'hotel') {
    return `Similar to hotels you've booked before (${entity.location})`;
  }
  if (type === 'flight') {
    return `You've flown to ${entity.destination} before`;
  }
  return 'Based on your booking history';
}

// ---------------------------------------------------------------------------
// Apply feedback penalties: subtract irrelevant count, add helpful boost
// ---------------------------------------------------------------------------
function applyFeedbackScore(baseScore, feedbackRows, key) {
  const rows = feedbackRows.filter(f => f.key === key);
  const helpful    = rows.filter(f => f.feedback === 'helpful').length;
  const irrelevant = rows.filter(f => f.feedback === 'irrelevant').length;
  return baseScore + helpful * 2 - irrelevant * 3;
}

// ---------------------------------------------------------------------------
// Fallback in-memory store (when DB is unavailable)
// ---------------------------------------------------------------------------
export const fallbackFeedback = [];
let feedbackIdCounter = 1;

// ---------------------------------------------------------------------------
// Main: generate recommendations for a user
// ---------------------------------------------------------------------------
export async function generateRecommendations(userId) {
  try {
    // 1. Fetch user's booking history
    const [bookings] = await pool.query(
      `SELECT b.hotel_id, b.flight_id,
              h.name AS hotelName, h.location AS hotelLocation, h.price_per_night AS hotelPrice, h.rating AS hotelRating,
              f.airline, f.origin, f.destination AS flightDest, f.price AS flightPrice
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN flights f ON b.flight_id = f.id
       WHERE b.user_id = ? AND b.status != 'cancelled'
       ORDER BY b.created_at DESC LIMIT 20`,
      [userId]
    );

    // 2. Fetch feedback to weight scores
    const [feedbackRows] = await pool.query(
      `SELECT recommendation_type, entity_id, destination, feedback
       FROM recommendation_feedback WHERE user_id = ?`,
      [userId]
    );
    const feedback = feedbackRows.map(f => ({
      key: f.entity_id ? `${f.recommendation_type}:${f.entity_id}` : `destination:${f.destination}`,
      feedback: f.feedback,
    }));

    // 3. Build tag profile from booking history
    const allTags = [];
    const visitedHotelIds  = new Set();
    const visitedFlightIds = new Set();
    const visitedDests     = new Set();

    for (const b of bookings) {
      if (b.hotel_id) {
        visitedHotelIds.add(b.hotel_id);
        allTags.push(...extractTags(b.hotelLocation));
      }
      if (b.flight_id) {
        visitedFlightIds.add(b.flight_id);
        visitedDests.add(b.flightDest);
        allTags.push(...extractTags(b.flightDest));
        allTags.push(...extractTags(b.origin));
      }
    }

    // 4. Fetch candidate hotels (excluding already-booked)
    const [hotels] = await pool.query(
      `SELECT id, name, location, price_per_night AS pricePerNight, rating
       FROM hotels ORDER BY rating DESC LIMIT 20`
    );

    // 5. Fetch candidate flights (excluding already-booked)
    const [flights] = await pool.query(
      `SELECT id, airline, origin, destination, price, seats_available AS seatsAvailable
       FROM flights WHERE seats_available > 0 ORDER BY price ASC LIMIT 20`
    );

    // 6. Score hotels
    const hotelRecs = hotels
      .filter(h => !visitedHotelIds.has(h.id))
      .map(h => {
        const tags = extractTags(h.location);
        const tagOverlap = tags.filter(t => allTags.includes(t)).length;
        const score = applyFeedbackScore(
          tagOverlap * 3 + Number(h.rating || 0),
          feedback,
          `hotel:${h.id}`
        );
        return { type: 'hotel', entity: h, score, tags, reason: buildReason('hotel', { location: h.location }, tags.length ? tags : ['popular destination']) };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 7. Score flights
    const flightRecs = flights
      .filter(f => !visitedFlightIds.has(f.id))
      .map(f => {
        const destTags = extractTags(f.destination);
        const tagOverlap = destTags.filter(t => allTags.includes(t)).length;
        const repeatDest = visitedDests.has(f.destination) ? 2 : 0;
        const score = applyFeedbackScore(
          tagOverlap * 3 + repeatDest,
          feedback,
          `flight:${f.id}`
        );
        return { type: 'flight', entity: f, score, tags: destTags, reason: buildReason('flight', { destination: f.destination }, []) };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 8. Destination recommendations
    const suggestedDests = suggestDestinations(allTags);
    const destRecs = suggestedDests
      .filter(d => !visitedDests.has(d))
      .map(dest => {
        const score = applyFeedbackScore(5, feedback, `destination:${dest}`);
        return { type: 'destination', entity: { name: dest }, score, tags: allTags.slice(0, 3), reason: buildReason('destination', {}, allTags.slice(0, 3)) };
      })
      .filter(r => r.score > 0)
      .slice(0, 3);

    // 9. Fallback: no history — recommend top-rated hotels and cheapest flights
    const hasHistory = bookings.length > 0;
    if (!hasHistory) {
      const fallbackHotels = hotels.slice(0, 3).map(h => ({
        type: 'hotel', entity: h, score: Number(h.rating || 0),
        tags: [], reason: 'Top-rated hotel on our platform',
      }));
      const fallbackFlights = flights.slice(0, 3).map(f => ({
        type: 'flight', entity: f, score: 1,
        tags: [], reason: 'Popular route on our platform',
      }));
      return { recommendations: [...fallbackHotels, ...fallbackFlights], hasHistory: false };
    }

    return {
      recommendations: [...hotelRecs, ...flightRecs, ...destRecs],
      hasHistory: true,
    };
  } catch (err) {
    console.warn('Recommendation generation failed:', err.message || err);
    return { recommendations: [], hasHistory: false };
  }
}

// ---------------------------------------------------------------------------
// Store feedback (DB with fallback)
// ---------------------------------------------------------------------------
export async function storeFeedback({ userId, recommendationType, entityId, destination, feedback }) {
  try {
    // Upsert: remove old feedback for same item then insert
    await pool.query(
      `DELETE FROM recommendation_feedback
       WHERE user_id = ? AND recommendation_type = ? AND (entity_id = ? OR destination = ?)`,
      [userId, recommendationType, entityId || null, destination || null]
    );
    const [result] = await pool.query(
      `INSERT INTO recommendation_feedback (user_id, recommendation_type, entity_id, destination, feedback)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, recommendationType, entityId || null, destination || null, feedback]
    );
    return result.insertId;
  } catch {
    // Fallback
    const existing = fallbackFeedback.findIndex(
      f => f.userId === userId && f.recommendationType === recommendationType &&
           (entityId ? f.entityId === entityId : f.destination === destination)
    );
    if (existing !== -1) fallbackFeedback.splice(existing, 1);
    const entry = { id: feedbackIdCounter++, userId, recommendationType, entityId, destination, feedback, createdAt: new Date().toISOString() };
    fallbackFeedback.push(entry);
    return entry.id;
  }
}
